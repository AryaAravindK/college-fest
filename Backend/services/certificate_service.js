/**
 * backend/services/certificate_service.js
 * Certificate Service for College Fest Website
 * - Full CRUD
 * - Bulk creation / deletion
 * - CSV & JSON export
 * - Search & pagination / filters
 * - Public listing
 * - Stats & analytics
 * - PDF generation (Surana College style)
 * - PDF regeneration
 * - Direct email delivery (buffer-based, demo email mode)
 */

const mongoose = require('mongoose');
const Certificate = require('../models/certificate_model');
const Event = require('../models/event_model');
const Team = require('../models/team_model');
const User = require('../models/user_model');
const {
  createCertificateValidator,
  updateCertificateValidator,
} = require('../validators/certificate_validator');
const puppeteer = require('puppeteer');
const { Parser } = require('json2csv');
const nodemailer = require('nodemailer');

// ----------------------
// Error + Helper
// ----------------------
class ApiError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function validateObjectId(id, name = 'id') {
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    throw new ApiError(`Invalid ${name}`, 400);
  }
}

// ----------------------
// Nodemailer setup (demo email mode)
// ----------------------
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
const DEMO_EMAIL = process.env.DEMO_EMAIL;

// ----------------------
// PDF Generator (Buffer)
// ----------------------
async function generateCertificatePDFBuffer({ eventName, type, recipientName, collegeName }) {
  const logoURL = '/logos/college_logo.png';
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const htmlContent = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Certificate</title>
    <style>
      body { margin:0; padding:0; font-family:'Times New Roman',serif; background:#faf9f6; display:flex; justify-content:center; align-items:center; }
      .certificate-container { width:90%; max-width:1100px; padding:70px 60px; text-align:center; background:#fff; border:16px solid #b8860b; outline:8px double #000; box-shadow:0 0 25px rgba(0,0,0,0.3); position:relative; }
      .certificate-container::before { content:"SURANA COLLEGE"; position:absolute; top:40%; left:50%; transform:translate(-50%,-50%) rotate(-20deg); font-size:100px; font-weight:bold; color:rgba(184,134,11,0.08); }
      .logo { width:150px; margin-bottom:15px; }
      .college-name { font-size:44px; font-weight:bold; text-transform:uppercase; letter-spacing:3px; color:#2c2c54; text-shadow:1px 1px #aaa; margin-bottom:30px; }
      .title { font-size:50px; font-weight:bold; margin:20px 0; color:#b8860b; text-transform:uppercase; }
      .subtitle { font-size:22px; margin:8px 0; color:#333; }
      .name { font-size:44px; margin:25px 0; text-decoration:underline; font-weight:bold; color:#000; font-family:'Brush Script MT',cursive; }
      .event-title { font-size:26px; font-weight:bold; margin-top:10px; color:#2c2c54; }
      .type { font-size:22px; margin-top:8px; color:#444; font-style:italic; }
      .footer { margin-top:120px; display:flex; justify-content:space-around; padding:0 50px; }
      .footer div { font-size:18px; border-top:2px solid #000; width:220px; text-align:center; padding-top:8px; font-weight:bold; color:#2c2c54; }
      .seal { position:absolute; bottom:70px; right:80px; width:120px; height:120px; border:4px solid #b8860b; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#b8860b; text-transform:uppercase; }
    </style>
  </head>
  <body>
    <div class="certificate-container">
      <img src="${logoURL}" class="logo"/>
      <div class="college-name">${collegeName}</div>
      <div class="title">Certificate of ${type === 'winner' ? 'Excellence' : 'Participation'}</div>
      <div class="subtitle">This certificate is proudly presented to</div>
      <div class="name">${recipientName}</div>
      <div class="subtitle">For participating in the event</div>
      <div class="event-title">${eventName}</div>
      <div class="type">${type === 'winner' ? 'Winner' : 'Participant'}</div>
      <div class="footer"><div>Coordinator</div><div>Head of Department</div><div>Principal</div></div>
      <div class="seal">Official Seal</div>
    </div>
  </body>
  </html>`;

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();
  return pdfBuffer;
}

// ----------------------
// Email sending (demo email always)
// ----------------------
async function sendCertificateEmail(_, pdfBuffer, recipientName) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: DEMO_EMAIL, // all emails go to single demo email
    subject: `Certificate for ${recipientName} - Surana College`,
    text: `Hello,\n\nCertificate for ${recipientName} is attached.\n\n- Surana College`,
    attachments: [
      {
        filename: `Certificate_${recipientName.replace(/\s+/g, '_')}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
}

// ----------------------
// Core CRUD & Email Flow
// ----------------------
async function createCertificateAndEmail(data) {
  const { error } = createCertificateValidator.validate(data);
  if (error) throw new ApiError(error.details[0].message);

  validateObjectId(data.eventId, 'eventId');
  validateObjectId(data.userId, 'userId');

  const event = await Event.findById(data.eventId);
  if (!event) throw new ApiError('Event not found');
  const user = await User.findById(data.userId);
  if (!user) throw new ApiError('User not found');

  const pdfBuffer = await generateCertificatePDFBuffer({
    eventName: event.name,
    type: data.type,
    recipientName: `${user.firstName} ${user.lastName}`,
    collegeName: 'Surana College',
  });

  await sendCertificateEmail(user.email, pdfBuffer, `${user.firstName} ${user.lastName}`);

  const cert = await Certificate.create({ ...data, pdfUrl: null });
  return { message: 'Certificate emailed successfully (demo email)', certificate: cert };
}

// Bulk email
async function bulkCreateAndEmailCertificates(eventId, type = 'participant') {
  validateObjectId(eventId, 'eventId');
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError('Event not found');

  const teams = await Team.find({ eventId }).populate('memberIds leaderId');
  const results = [];

  for (const team of teams) {
    const members = [...team.memberIds, team.leaderId];
    for (const member of members) {
      const pdfBuffer = await generateCertificatePDFBuffer({
        eventName: event.name,
        type,
        recipientName: `${member.firstName} ${member.lastName}`,
        collegeName: 'Surana College',
      });
      await sendCertificateEmail(member.email, pdfBuffer, `${member.firstName} ${member.lastName}`);
      const cert = await Certificate.create({ eventId, userId: member._id, type, pdfUrl: null });
      results.push(cert);
    }
  }
  return { message: 'All certificates emailed successfully (demo email)', certificates: results };
}

// ----------------------
// Other CRUD / Listing / Stats / Exports
// ----------------------
async function updateCertificate(id, updates) {
  validateObjectId(id, 'certificateId');
  const { error } = updateCertificateValidator.validate(updates);
  if (error) throw new ApiError(error.details[0].message);
  const cert = await Certificate.findByIdAndUpdate(id, updates, { new: true });
  if (!cert) throw new ApiError('Certificate not found', 404);
  return cert;
}

async function deleteCertificate(id) {
  validateObjectId(id, 'certificateId');
  const cert = await Certificate.findByIdAndDelete(id);
  if (!cert) throw new ApiError('Certificate not found', 404);
  return cert;
}

async function bulkDeleteCertificates(eventId) {
  validateObjectId(eventId, 'eventId');
  return Certificate.deleteMany({ eventId });
}

async function getCertificateById(id) {
  validateObjectId(id, 'certificateId');
  const cert = await Certificate.findById(id)
    .populate('eventId', 'name')
    .populate('userId', 'firstName lastName email');
  if (!cert) throw new ApiError('Certificate not found', 404);
  return cert;
}

async function listCertificates({ page = 1, limit = 10, sort = '-createdAt' }) {
  return Certificate.find()
    .populate('eventId', 'name')
    .populate('userId', 'firstName lastName')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);
}

async function listPublicCertificates(eventId) {
  validateObjectId(eventId, 'eventId');
  return Certificate.find({ eventId })
    .populate('userId', 'firstName lastName')
    .select('type pdfUrl createdAt');
}

async function searchCertificates({ query, eventId, type, from, to }) {
  const filter = {};
  if (eventId) filter.eventId = eventId;
  if (type) filter.type = type;
  if (from || to) filter.createdAt = { ...(from && { $gte: new Date(from) }), ...(to && { $lte: new Date(to) }) };

  return Certificate.find(filter).or([
    { type: new RegExp(query || '', 'i') },
    { pdfUrl: new RegExp(query || '', 'i') },
  ])
    .populate('userId', 'firstName lastName')
    .populate('eventId', 'name');
}

async function getCertificateStats() {
  const total = await Certificate.countDocuments();
  const byType = await Certificate.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]);
  return { total, byType };
}

async function getCertificateStatsByEvent() {
  return Certificate.aggregate([
    { $group: { _id: '$eventId', total: { $sum: 1 } } },
    { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } },
    { $unwind: '$event' },
    { $project: { eventName: '$event.name', total: 1 } },
  ]);
}

async function regenerateCertificatePDF(certificateId) {
  const cert = await getCertificateById(certificateId);
  const pdfBuffer = await generateCertificatePDFBuffer({
    eventName: cert.eventId.name,
    type: cert.type,
    recipientName: `${cert.userId.firstName} ${cert.userId.lastName}`,
    collegeName: 'Surana College',
  });
  await sendCertificateEmail(cert.userId.email, pdfBuffer, `${cert.userId.firstName} ${cert.userId.lastName}`);
  return { message: 'Certificate regenerated and emailed successfully (demo email)' };
}

// CSV / JSON export
async function exportCertificatesCSV(eventId) {
  const filter = eventId ? { eventId } : {};
  const certs = await Certificate.find(filter)
    .populate('eventId', 'name')
    .populate('userId', 'firstName lastName email');

  const data = certs.map(c => ({
    event: c.eventId?.name,
    user: `${c.userId?.firstName} ${c.userId?.lastName}`,
    email: c.userId?.email,
    type: c.type,
    pdfUrl: c.pdfUrl,
    createdAt: c.createdAt,
  }));

  const parser = new Parser({ fields: ['event', 'user', 'email', 'type', 'pdfUrl', 'createdAt'] });
  return parser.parse(data);
}

async function exportCertificatesJSON(eventId) {
  const filter = eventId ? { eventId } : {};
  return Certificate.find(filter)
    .populate('eventId', 'name')
    .populate('userId', 'firstName lastName email')
    .lean();
}

// ----------------------
// Export
// ----------------------
module.exports = {
  ApiError,
  createCertificateAndEmail,
  bulkCreateAndEmailCertificates,
  updateCertificate,
  deleteCertificate,
  bulkDeleteCertificates,
  getCertificateById,
  listCertificates,
  listPublicCertificates,
  searchCertificates,
  getCertificateStats,
  getCertificateStatsByEvent,
  regenerateCertificatePDF,
  exportCertificatesCSV,
  exportCertificatesJSON,
  generateCertificatePDFBuffer,
  sendCertificateEmail,
};
