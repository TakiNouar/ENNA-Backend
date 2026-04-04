const express = require("express");
const {
  createMeeting,
  deleteMeeting,
  listMeetings,
  updateMeeting,
} = require("../controllers/meetingController");
const {
  requireRole,
} = require("../middleware/requireRole");
const {
  requireTasksMeetingsAccess,
} = require("../middleware/permissions");

const router = express.Router();

router.get("/", requireTasksMeetingsAccess, listMeetings);
router.post(
  "/",
  requireRole("admin", "root"),
  createMeeting,
);
router.patch(
  "/:meetingId",
  requireRole("admin", "root"),
  updateMeeting,
);
router.delete(
  "/:meetingId",
  requireRole("admin", "root"),
  deleteMeeting,
);

module.exports = router;
