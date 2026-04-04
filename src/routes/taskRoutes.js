const express = require("express");
const {
  createTask,
  deleteTask,
  listTasks,
  updateTask,
} = require("../controllers/taskController");
const {
  requireRole,
} = require("../middleware/requireRole");
const {
  requireTasksMeetingsAccess,
} = require("../middleware/permissions");

const router = express.Router();

router.get("/", requireTasksMeetingsAccess, listTasks);
router.post("/", requireRole("admin", "root"), createTask);
router.patch(
  "/:taskId",
  requireRole("admin", "root"),
  updateTask,
);
router.delete(
  "/:taskId",
  requireRole("admin", "root"),
  deleteTask,
);

module.exports = router;
