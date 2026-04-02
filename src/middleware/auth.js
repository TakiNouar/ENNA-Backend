const { AUTH_COOKIE_NAME } = require("../config");
const { verifyAuthToken } = require("../utils/token");

function requireAuth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    return res
      .status(401)
      .json({ error: "Authentication required" });
  }

  try {
    const payload = verifyAuthToken(token);
    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };
    return next();
  } catch {
    return res
      .status(401)
      .json({ error: "Invalid or expired session" });
  }
}

module.exports = { requireAuth };
