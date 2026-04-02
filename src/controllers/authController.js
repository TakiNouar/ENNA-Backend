const {
  AUTH_COOKIE_DOMAIN,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_SAME_SITE,
  AUTH_COOKIE_SECURE,
} = require("../config");
const {
  accountService,
} = require("../services/accountService");
const { signAuthToken } = require("../utils/token");

function cookieOptions() {
  const sameSite = AUTH_COOKIE_SAME_SITE;
  const secure =
    sameSite === "none" ? true : AUTH_COOKIE_SECURE;

  return {
    httpOnly: true,
    secure,
    sameSite,
    ...(AUTH_COOKIE_DOMAIN
      ? { domain: AUTH_COOKIE_DOMAIN }
      : {}),
    path: "/",
    maxAge: 1000 * 60 * 60 * 8,
  };
}

async function login(req, res, next) {
  try {
    const account = await accountService.authenticate(
      req.body.username,
      req.body.password,
    );
    if (!account) {
      return res
        .status(401)
        .json({ error: "Invalid username or password" });
    }

    const token = signAuthToken(account);
    res.cookie(AUTH_COOKIE_NAME, token, cookieOptions());
    return res.json({ user: account });
  } catch (error) {
    return next(error);
  }
}

function logout(req, res) {
  const sameSite = AUTH_COOKIE_SAME_SITE;
  const secure =
    sameSite === "none" ? true : AUTH_COOKIE_SECURE;

  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure,
    sameSite,
    ...(AUTH_COOKIE_DOMAIN
      ? { domain: AUTH_COOKIE_DOMAIN }
      : {}),
    path: "/",
  });
  return res.json({ ok: true });
}

function me(req, res) {
  return res.json({ user: req.user });
}

module.exports = { login, logout, me };
