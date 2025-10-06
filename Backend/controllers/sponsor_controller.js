const Event = require('../models/event_model');
const Sponsor = require('../models/sponsor_model');

exports.listSponsors = async (req, res, next) => {
  try {
    const sponsors = await Sponsor.find({ _id: { $in: req.event.sponsors } });
    res.json(sponsors);
  } catch (err) { next(err); }
};

exports.addSponsor = async (req, res, next) => {
  try {
    const sponsor = new Sponsor(req.body);
    await sponsor.save();
    req.event.sponsors.push(sponsor._id);
    await req.event.save();
    res.status(201).json(sponsor);
  } catch (err) { next(err); }
};

exports.removeSponsor = async (req, res, next) => {
  try {
    req.event.sponsors.pull(req.params.sponsorId);
    await req.event.save();
    await Sponsor.findByIdAndDelete(req.params.sponsorId);
    res.status(204).end();
  } catch (err) { next(err); }
};
