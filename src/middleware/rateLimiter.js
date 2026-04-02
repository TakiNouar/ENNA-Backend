const rateLimit = require("express-rate-limit");
const {
  AUTH_RATE_LIMIT_MAX,
  AUTH_RATE_LIMIT_WINDOW_MS,
} = require("../config");

const authRateLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const username =
      typeof req.body?.username === "string"
        ? req.body.username.trim().toLowerCase()
        : "anonymous";
    return `${req.ip}:${username}`;
  },
  message: {
    error:
      "Too many authentication attempts. Please try again later.",
  },
});

module.exports = { authRateLimiter };
