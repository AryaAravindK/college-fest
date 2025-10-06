/**
 * backend/services/payment_service.js
 * Mock payment service ("dummypayment") for College Fest Website
 * Extended with:
 *  - sendPaymentReminders()
 *  - resendReceipt(paymentId)
 *  - getEventRevenueStats()
 */

const mongoose = require('mongoose');
const Payment = require('../models/payment_model');
const Event = require('../models/event_model');
const User = require('../models/user_model');
const Team = require('../models/team_model');
const { createPaymentValidator } = require('../validators/payment_validator');
const notificationService = require('./notification_service');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const EMAIL_USER = process.env.EMAIL_USER || null;
const EMAIL_PASS = process.env.EMAIL_PASS || null;
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const DEMO_EMAIL = process.env.DEMO_EMAIL || null;

// Your logo and college name
const logoURL = '/logos/college_logo.png';
const collegeName = 'SURANA COLLEGE AUTONOMOUS';

class ApiError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ----------------------
// Helpers
// ----------------------
function validateObjectId(id, name = 'id') {
  if (!id) throw new ApiError(`${name} is required`, 400);
  if (!mongoose.Types.ObjectId.isValid(String(id))) throw new ApiError(`Invalid ${name}`, 400);
}

async function findEventOrThrow(eventId) {
  validateObjectId(eventId, 'eventId');
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError('Event not found', 404);
  return event;
}

async function findUserOrThrow(userId) {
  validateObjectId(userId, 'userId');
  const user = await User.findById(userId);
  if (!user) throw new ApiError('User not found', 404);
  return user;
}

async function findTeamOrThrow(teamId) {
  validateObjectId(teamId, 'teamId');
  const team = await Team.findById(teamId);
  if (!team) throw new ApiError('Team not found', 404);
  return team;
}

// Nodemailer helper
async function sendEmail({ to, subject, text, html = null, attachments = [] }) {
  if (!EMAIL_USER || !EMAIL_PASS) return { ok: false, reason: 'email_not_configured' };

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: Number(EMAIL_PORT) === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });

  await transporter.sendMail({ from: `"College Fest" <${EMAIL_USER}>`, to, subject, text, html, attachments });
  return { ok: true };
}

// Generate receipt PDF and store (optional) or return Buffer
async function generateReceiptPDF({ paymentId, eventTitle, amount, payerName, mode = 'online', transactionId, date = new Date(), saveToServer = true }) {
  const html = `
    <html>
      <head><meta charset="utf-8" /><title>Receipt ${paymentId}</title>
        <style>
          body { font-family: Arial; padding:30px; background:#f5f5f5;}
          .card{width:800px;margin:0 auto;background:#fff;padding:30px;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,0.1);}
          .header{text-align:center;}
          .logo{width:100px;}
          .title{font-size:22px;margin-top:10px;}
          .details{margin-top:20px;font-size:16px;}
          .row{display:flex;justify-content:space-between;margin:8px 0;}
          .footer{margin-top:30px;color:#666;font-size:14px;text-align:center;}
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">${logoURL ? `<img src="${logoURL}" class="logo" />` : ''}<div class="title">${collegeName} — Payment Receipt</div></div>
          <div class="details">
            <div class="row"><strong>Receipt ID:</strong> <span>${paymentId}</span></div>
            <div class="row"><strong>Transaction ID:</strong> <span>${transactionId || 'N/A'}</span></div>
            <div class="row"><strong>Payer:</strong> <span>${payerName}</span></div>
            <div class="row"><strong>Event:</strong> <span>${eventTitle}</span></div>
            <div class="row"><strong>Amount:</strong> <span>₹ ${Number(amount).toFixed(2)}</span></div>
            <div class="row"><strong>Mode:</strong> <span>${mode}</span></div>
            <div class="row"><strong>Date:</strong> <span>${new Date(date).toLocaleString()}</span></div>
          </div>
          <div class="footer">This is a computer-generated receipt.</div>
        </div>
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  if (saveToServer) {
    const receiptsDir = path.join(__dirname, '..', 'public', 'receipts');
    if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir, { recursive: true });
    const fileName = `receipt_${paymentId}_${Date.now()}.pdf`;
    const filePath = path.join(receiptsDir, fileName);
    await page.pdf({ path: filePath, format: 'A4', printBackground: true });
    await browser.close();
    return `/receipts/${fileName}`;
  } else {
    const buffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    return buffer;
  }
}

// ----------------------
// Payment Service
// ----------------------
async function createPayment(payload, options = { sendEmail: true, notify: true }) {
  const { error, value } = createPaymentValidator.validate(payload);
  if (error) throw new ApiError(error.details[0].message, 422);

  const event = await findEventOrThrow(value.eventId);
  const fee = Number(event.fee || event.entryFee || event.amountDue || 0);

  let payer;
  if (value.userId) payer = await findUserOrThrow(value.userId);
  else if (value.teamId) payer = await findTeamOrThrow(value.teamId);
  else throw new ApiError('Either userId or teamId must be provided for payment', 400);

  const amount = Number(value.amount);
  if (fee > 0) {
    if (!amount || Number(amount) <= 0) throw new ApiError('Payment amount is required for this paid event', 400);
    if (Number(amount) !== fee) throw new ApiError(`Payment amount must equal event fee (${fee})`, 400);
  } else if (amount && Number(amount) !== 0) throw new ApiError('This event is free; payment amount must be 0', 400);

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [payment] = await Payment.create([{
      userId: value.userId ? mongoose.Types.ObjectId(value.userId) : null,
      teamId: value.teamId ? mongoose.Types.ObjectId(value.teamId) : null,
      eventId: mongoose.Types.ObjectId(value.eventId),
      amount: fee,
      mode: value.mode || 'online',
      status: 'pending',
      transactionId: null
    }], { session });

    const txId = `DUMMY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    payment.status = 'completed';
    payment.transactionId = txId;
    await payment.save({ session });

    const payerName = value.userId
      ? `${payer.firstName || ''} ${payer.lastName || ''}`.trim() || (payer.email || 'User')
      : payer.teamName || `Team_${String(payer._id).slice(-6)}`;

    // Decide if saving PDF or just emailing (demo mode)
    let receiptResult;
    if (DEMO_EMAIL) {
      const buffer = await generateReceiptPDF({
        paymentId: payment._id.toString(),
        eventTitle: event.title || event.name || 'Event',
        amount: payment.amount,
        payerName,
        mode: payment.mode,
        transactionId: txId,
        saveToServer: false
      });
      await sendEmail({
        to: DEMO_EMAIL,
        subject: `Payment Receipt — ${event.title || event.name || 'Event'}`,
        text: 'Your receipt is attached.',
        attachments: [{ filename: 'receipt.pdf', content: buffer }]
      });
      receiptResult = { receiptUrl: null };
    } else {
      const receiptUrl = await generateReceiptPDF({
        paymentId: payment._id.toString(),
        eventTitle: event.title || event.name || 'Event',
        amount: payment.amount,
        payerName,
        mode: payment.mode,
        transactionId: txId
      });
      if (options.sendEmail && value.userId && payer.email) {
        try {
          await sendEmail({
            to: payer.email,
            subject: `Payment Receipt — ${event.title || event.name || 'Event'}`,
            text: `Thank you for your payment. Receipt: ${receiptUrl}`,
            html: `<p>Thank you for your payment for <strong>${event.title || event.name || 'Event'}</strong>.</p><p>Receipt: <a href="${receiptUrl}">${receiptUrl}</a></p>`,
          });
        } catch (err) {}
      }
      receiptResult = { receiptUrl };
    }

    await session.commitTransaction();
    session.endSession();

    // Notifications
    if (options.notify) {
      const notePayload = {
        message: `Payment received: ₹${payment.amount} for ${event.title || event.name || 'Event'}. Transaction: ${txId}`,
        type: 'payment'
      };
      if (value.userId) notePayload.userId = value.userId;
      if (value.teamId) notePayload.teamId = value.teamId;
      if (DEMO_EMAIL) {
        const demoUser = await User.findOne({ email: DEMO_EMAIL });
        if (demoUser) notePayload.userId = demoUser._id;
      }
      try {
        await notificationService.createNotification(notePayload, { sendEmail: false, socketIo: null });
      } catch (err) {}
    }

    const freshPayment = await Payment.findById(payment._id);
    return { payment: freshPayment, transactionId: txId, ...receiptResult };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

// ----------------------
// Bulk Payments
// ----------------------
async function bulkCreatePayments(paymentsArray, options = { sendEmail: true, notify: true }) {
  if (!Array.isArray(paymentsArray) || !paymentsArray.length) throw new ApiError('paymentsArray must be a non-empty array', 400);

  const results = [];
  for (const p of paymentsArray) {
    try {
      const res = await createPayment(p, options);
      results.push({ success: true, payment: res.payment, transactionId: res.transactionId });
    } catch (err) {
      results.push({ success: false, error: err.message });
    }
  }
  return results;
}

// ----------------------
// Payment Statistics
// ----------------------
async function getPaymentStats(filter = {}) {
  const match = {};
  if (filter.eventId) match.eventId = mongoose.Types.ObjectId(filter.eventId);
  if (filter.userId) match.userId = mongoose.Types.ObjectId(filter.userId);
  if (filter.teamId) match.teamId = mongoose.Types.ObjectId(filter.teamId);

  const stats = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: '$amount' },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, '$amount', 0] } },
        count: { $sum: 1 }
      }
    }
  ]);

  return stats[0] || { totalPayments: 0, completed: 0, pending: 0, failed: 0, count: 0 };
}

// ----------------------
// Verify Payment
// ----------------------
async function verifyPayment(transactionId) {
  if (!transactionId) throw new ApiError('transactionId is required', 400);
  const payment = await Payment.findOne({ transactionId });
  if (!payment) throw new ApiError('Payment not found', 404);
  return payment;
}

// ----------------------
// Refund Payment
// ----------------------
async function refundPayment(paymentId, reason = 'refund') {
  validateObjectId(paymentId, 'paymentId');
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new ApiError('Payment not found', 404);
  if (payment.status !== 'completed') throw new ApiError('Only completed payments can be refunded', 400);

  const refundTx = `REFUND-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  payment.status = 'failed';
  payment.transactionId = `${payment.transactionId}|REFUND:${refundTx}`;
  await payment.save();

  try {
    const notePayload = {
      message: `Payment refunded for event ${payment.eventId}. Refund TX: ${refundTx}. Reason: ${reason}`,
      type: 'payment'
    };
    if (payment.userId) notePayload.userId = payment.userId.toString();
    if (payment.teamId) notePayload.teamId = payment.teamId.toString();
    await notificationService.createNotification(notePayload, { sendEmail: false });
  } catch (err) {}

  return { ok: true, refundTx };
}

// ----------------------
// Get Payment by ID
// ----------------------
async function getPaymentById(paymentId) {
  validateObjectId(paymentId, 'paymentId');
  const p = await Payment.findById(paymentId).populate('userId').populate('teamId').populate('eventId');
  if (!p) throw new ApiError('Payment not found', 404);
  return p;
}

// ----------------------
// List Payments
// ----------------------
async function listPayments(options = {}) {
  const { page = 1, limit = 20, userId, teamId, eventId, status, mode, from, to, sortBy = 'createdAt', sortDir = 'desc' } = options;

  const filter = {};
  if (userId) filter.userId = mongoose.Types.ObjectId(userId);
  if (teamId) filter.teamId = mongoose.Types.ObjectId(teamId);
  if (eventId) filter.eventId = mongoose.Types.ObjectId(eventId);
  if (status) filter.status = status;
  if (mode) filter.mode = mode;
  if (from || to) filter.createdAt = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) };

  const sortObj = { [sortBy]: sortDir === 'asc' ? 1 : -1 };

  const payments = await Payment.find(filter).populate('userId').populate('teamId').populate('eventId').sort(sortObj).skip((page - 1) * limit).limit(Number(limit));
  const total = await Payment.countDocuments(filter);
  return { payments, total, page: Number(page), limit: Number(limit) };
}

// ----------------------
// Delete Payment
// ----------------------
async function deletePayment(paymentId) {
  validateObjectId(paymentId, 'paymentId');
  const removed = await Payment.findByIdAndDelete(paymentId);
  if (!removed) throw new ApiError('Payment not found', 404);
  return { message: 'Payment deleted', paymentId };
}

// ----------------------
// Extended Functions
// ----------------------

// 1️⃣ Resend receipt
async function resendReceipt(paymentId) {
  const payment = await getPaymentById(paymentId);
  const payerName = payment.userId
    ? `${payment.userId.firstName || ''} ${payment.userId.lastName || ''}`.trim() || (payment.userId.email || 'User')
    : payment.teamId.teamName || `Team_${String(payment.teamId._id).slice(-6)}`;
  const eventTitle = payment.eventId.title || payment.eventId.name || 'Event';

  const buffer = await generateReceiptPDF({
    paymentId: payment._id.toString(),
    eventTitle,
    amount: payment.amount,
    payerName,
    mode: payment.mode,
    transactionId: payment.transactionId,
    saveToServer: false
  });

  const emailTo = DEMO_EMAIL || (payment.userId ? payment.userId.email : null);
  if (!emailTo) return { ok: false, reason: 'No email to send receipt' };

  await sendEmail({
    to: emailTo,
    subject: `Payment Receipt — ${eventTitle}`,
    text: 'Your receipt is attached.',
    attachments: [{ filename: 'receipt.pdf', content: buffer }]
  });

  return { ok: true };
}

// 2️⃣ Send payment reminders for pending payments
async function sendPaymentReminders() {
  const pendingPayments = await Payment.find({ status: 'pending' }).populate('userId').populate('teamId').populate('eventId');
  const reminders = [];

  for (const p of pendingPayments) {
    const payerEmail = DEMO_EMAIL || (p.userId ? p.userId.email : null);
    if (!payerEmail) continue;

    const message = `Reminder: Your payment of ₹${p.amount} for event ${p.eventId.title || p.eventId.name || 'Event'} is pending.`;
    try {
      await sendEmail({ to: payerEmail, subject: 'Pending Payment Reminder', text: message });
      reminders.push({ paymentId: p._id, ok: true });
    } catch (err) {
      reminders.push({ paymentId: p._id, ok: false, error: err.message });
    }
  }

  return reminders;
}

// 3️⃣ Event-wise revenue stats
async function getEventRevenueStats(eventId) {
  const match = {};
  if (eventId) match.eventId = mongoose.Types.ObjectId(eventId);

  const stats = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$eventId',
        totalAmount: { $sum: '$amount' },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, '$amount', 0] } },
        paymentCount: { $sum: 1 }
      }
    }
  ]);

  return stats;
}

// ----------------------
// Export
// ----------------------
module.exports = {
  ApiError,
  createPayment,
  bulkCreatePayments,
  getPaymentStats,
  verifyPayment,
  refundPayment,
  getPaymentById,
  listPayments,
  deletePayment,
  generateReceiptPDF,
  resendReceipt,
  sendPaymentReminders,
  getEventRevenueStats
};
