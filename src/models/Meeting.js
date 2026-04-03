const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    number: {
      type: String,
      default: "",
    },
    subject: {
      type: String,
      default: "",
    },
    dateTime: {
      type: Date,
      required: true,
      index: true,
    },
    with: {
      type: String,
      default: "",
    },
    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const Meeting =
  mongoose.models.Meeting ||
  mongoose.model("Meeting", meetingSchema);

module.exports = { Meeting };
