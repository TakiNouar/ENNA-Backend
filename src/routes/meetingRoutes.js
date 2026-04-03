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

const router = express.Router();

router.get("/", listMeetings);
router.post(
  "/",
  requireRole("admin", "root"),
  createMeeting,
);
router.patch("/:meetingId", updateMeeting);
router.delete(
  "/:meetingId",
  requireRole("admin", "root"),
  deleteMeeting,
);

module.exports = router;
