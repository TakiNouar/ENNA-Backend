const bcrypt = require("bcryptjs");
const { BCRYPT_ROUNDS } = require("../config");

async function hashPassword(plainTextPassword) {
  return bcrypt.hash(plainTextPassword, BCRYPT_ROUNDS);
}

async function verifyPassword(plainTextPassword, hash) {
  return bcrypt.compare(plainTextPassword, hash);
}

module.exports = { hashPassword, verifyPassword };
