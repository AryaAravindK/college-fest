const express = require('express');
const router = express.Router();
const sponsorController = require('../controllers/sponsor_controller');
const eventMiddleware = require('../middlewares/event_middleware');
const authMiddleware = require('../middlewares/auth_middleware');

// Get sponsors for an event
router.get('/events/:slug/sponsors', eventMiddleware.preloadEventBySlug, sponsorController.listSponsors);

// Add sponsor to event
router.post('/events/:slug/sponsors', authMiddleware.protect, eventMiddleware.preloadEventAndCheckOwnership, sponsorController.addSponsor);

// Remove sponsor from event
router.delete('/events/:slug/sponsors/:sponsorId', authMiddleware.protect, eventMiddleware.preloadEventAndCheckOwnership, sponsorController.removeSponsor);

module.exports = router;
