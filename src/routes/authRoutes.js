const express = require("express");
const {
  login,
  logout,
  me,
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const {
  authRateLimiter,
} = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/login", authRateLimiter, login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);

module.exports = router;
