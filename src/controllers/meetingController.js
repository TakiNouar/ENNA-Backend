const {
  meetingService,
} = require("../services/meetingService");

async function listMeetings(req, res, next) {
  try {
    const meetings = await meetingService.listMeetings();
    return res.json({ meetings });
  } catch (error) {
    return next(error);
  }
}

async function createMeeting(req, res, next) {
  try {
    const meeting = await meetingService.createMeeting(
      req.body,
    );
    return res.status(201).json({ meeting });
  } catch (error) {
    return next(error);
  }
}

async function updateMeeting(req, res, next) {
  try {
    const meeting = await meetingService.updateMeeting(
      req.params.meetingId,
      req.body,
    );
    return res.json({ meeting });
  } catch (error) {
    return next(error);
  }
}

async function deleteMeeting(req, res, next) {
  try {
    await meetingService.deleteMeeting(
      req.params.meetingId,
    );
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
};
