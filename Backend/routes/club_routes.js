const express = require('express');
const router = express.Router();
const { getExistingClubs,createClub } = require('../controllers/auth_controller');
const {protect} = require('../middlewares/auth_middleware');



// club routes
router.get('/clubs', getExistingClubs);
router.post('/create-club', createClub);

module.exports = router;