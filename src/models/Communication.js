const mongoose = require("mongoose");
const {
  COMMUNICATION_STATUS_VALUES,
  COMMUNICATION_TYPE_VALUES,
} = require("../middleware/validation");

const communicationSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    number: {
      type: String,
      required: true,
      index: true,
      default: "",
    },
    type: {
      type: String,
      enum: COMMUNICATION_TYPE_VALUES,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: COMMUNICATION_STATUS_VALUES,
      required: true,
      index: true,
    },
    site: {
      type: String,
      default: "",
    },
    equipment: {
      type: String,
      default: "",
    },
    date: {
      type: String,
      default: "",
      index: true,
    },
    observation: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const Communication =
  mongoose.models.Communication ||
  mongoose.model("Communication", communicationSchema);

module.exports = { Communication };
