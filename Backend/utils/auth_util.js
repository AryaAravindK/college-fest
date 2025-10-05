/**
 * backend/utils/auth_util.js
 * Utility functions for authentication: token handling, email verification, password reset, phone OTP
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user_model');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BACKEND_URL = process.env.BACKEND_URL;

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Generate JWT for a user
 * @param {Object} user - User document
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, tokenVersion: user.tokenVersion },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Send verification email
 * @param {Object} user - User document
 */
const sendVerificationEmail = async (user) => {
  const token = user.createVerificationToken();
  await user.save();

  const url = `${BACKEND_URL}/api/auth/verify-email?token=${token}`;

await transporter.sendMail({
  from: `"Sahara College" <${process.env.EMAIL_USER}>`,
  to: user.email,
  subject: 'Verify Your Sahara College Email',
  html: `
    <div style="font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background-color: #004080; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 24px;">Sahara College</h2>
        </div>

        <!-- Body -->
        <div style="padding: 30px; color: #333333;">
          <p style="font-size: 16px;">Hello <strong>${user.firstName}</strong>,</p>
          <p style="font-size: 16px;">
            Welcome to Sahara College! Please verify your email address by clicking the button below. This link will expire in <strong>24 hours</strong>.
          </p>

          <p style="text-align: center; margin: 30px 0;">
            <a href="${url}" 
               style="background-color: #004080; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold;">
              Verify Email
            </a>
          </p>

          <p style="font-size: 14px; color: #777777;">
            If you did not create an account, you can safely ignore this email.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f0f0f0; color: #555555; padding: 15px; text-align: center; font-size: 12px;">
          Sahara College | 123 College Ave, City, State | &copy; ${new Date().getFullYear()}
        </div>
      </div>
    </div>
  `
});


  return token;
};

/**
 * Send password reset email
 * @param {Object} user - User document
 */
const sendPasswordResetEmail = async (user) => {
  const token = user.createPasswordResetToken();
  await user.save();

  const url = `${BACKEND_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Reset Your Password',
    html: `<p>Hello ${user.name},</p>
           <p>Click <a href="${url}">here</a> to reset your password. This link expires in 1 hour.</p>`
  });

  return token;
};

/**
 * Send phone OTP via Twilio
 * @param {Object} user - User document
 */
const sendPhoneOtp = async (user) => {
  const otp = user.createPhoneOtp();
  await user.save();

  await twilioClient.messages.create({
    body: `Your OTP for College Fest is ${otp}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: user.phone
  });

  return otp;
};

/**
 * Verify JWT token
 * @param {String} token - JWT token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = {
  generateToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPhoneOtp,
  verifyToken
};
