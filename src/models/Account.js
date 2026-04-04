const mongoose = require("mongoose");

const ACCOUNT_ROLES = ["root", "admin", "user"];
const ACCOUNT_TYPE_VALUES = [
  "global",
  "radar",
  "com",
  "nav",
  "atm",
  "none",
];

const accountSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    usernameLower: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    role: {
      type: String,
      enum: ACCOUNT_ROLES,
      required: true,
    },
    type: {
      type: String,
      enum: ACCOUNT_TYPE_VALUES,
      required: true,
      default: "none",
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const Account =
  mongoose.models.Account ||
  mongoose.model("Account", accountSchema);

module.exports = {
  Account,
  ACCOUNT_ROLES,
  ACCOUNT_TYPE_VALUES,
};
