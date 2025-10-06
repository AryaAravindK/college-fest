// backend/app.js
const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');

// Load environment variables
dotenv.config();

const app = express();

// ----------------------------
// MIDDLEWARE
// ----------------------------
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
app.use(cors()); 
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); 
}

// ----------------------------
// ROUTES
// ----------------------------
const userRoutes = require('./routes/user_routes');
const authRoutes = require('./routes/auth_routes');
const clubRoutes = require('./routes/club_routes');
const teamRoutes = require('./routes/team_routes');
const resultRoutes = require('./routes/result_routes');
const registrationRoutes = require('./routes/registration_routes');
const paymentRoutes = require('./routes/payment_routes');
const notificationRoutes = require('./routes/notification_routes');
const feedbackRoutes = require('./routes/feedback_routes');
const eventRoutes = require('./routes/event_routes');
const certificateRoutes = require('./routes/certificate_routes');
const announcementRoutes = require('./routes/announcement_routes');
const eventAnnouncementRoutes = require('./routes/announcement_routes');
const eventRegistrationRoutes = require('./routes/registration_routes');
const eventResultRoutes = require('./routes/result_routes');
const dashboardRoutes = require('./routes/dashboard_routes');
const sponsorRoutes = require('./routes/sponsor_routes');

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/club', clubRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedbacks', feedbackRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/dashboards', dashboardRoutes);
// Event-level endpoints
app.use('/api', eventAnnouncementRoutes);
app.use('/api', eventRegistrationRoutes);
app.use('/api', eventResultRoutes);
app.use('/api/sponsors', sponsorRoutes);

// ----------------------------
// HEALTH CHECK
// ----------------------------
app.get('/', (req, res) => {
  res.send('✅ API is running...');
});

// ----------------------------
// ERROR HANDLING
// ----------------------------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

module.exports = app;
