const mongoose = require("mongoose");
const {
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
} = require("../middleware/validation");

const taskSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    num: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      default: "",
    },
    about: {
      type: String,
      default: "",
    },
    priority: {
      type: String,
      enum: TASK_PRIORITY_VALUES,
      default: "medium",
    },
    status: {
      type: String,
      enum: TASK_STATUS_VALUES,
      default: "todo",
    },
    due: {
      type: String,
      default: "",
    },
    missionMgr: {
      type: String,
      default: "",
    },
    mailDate: {
      type: String,
      default: "",
    },
    procDate: {
      type: String,
      default: "",
    },
    responsible: {
      type: String,
      default: "",
    },
    synthese: {
      type: String,
      default: "",
    },
    obs: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const Task =
  mongoose.models.Task ||
  mongoose.model("Task", taskSchema);

module.exports = { Task };
