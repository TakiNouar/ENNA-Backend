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

const router = express.Router();

router.get("/", listTasks);
router.post("/", requireRole("admin"), createTask);
router.patch("/:taskId", requireRole("admin"), updateTask);
router.delete("/:taskId", requireRole("admin"), deleteTask);

module.exports = router;
