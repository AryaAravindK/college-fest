require('../models/sponsor_model'); 
const Club = require('../models/club_model');

const getExistingClubs = async (req, res) => {
  try {
    const clubs = await Club.find();
    res.status(200).json({ message: 'exsisting Clubs fetched sucessfully ', "clubs": clubs});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'error', error: err.message });
  }
};
const createClub = async (req, res) => {
  try {
    const { name, description } = req.body;
    const existingClub = await Club.findOne({ name });
    if (existingClub) {
      return res.status(400).json({ message: 'Club already exists' });
    } 
    const club = new Club({ name, description });
    await club.save();
    res.status(201).json({ message: 'Club created successfully', club });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'error', error: err.message });
  }
};

module.exports = {
  getExistingClubs,
  createClub
};