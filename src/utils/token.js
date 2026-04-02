const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config");

function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

function verifyAuthToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signAuthToken, verifyAuthToken };
