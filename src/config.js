const path = require("path");

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`,
    );
  }
  return value;
}

function parseBoolean(value, fallback) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseOrigins(value) {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseSameSite(value) {
  const normalized = String(value || "strict")
    .trim()
    .toLowerCase();

  if (["strict", "lax", "none"].includes(normalized)) {
    return normalized;
  }

  return "strict";
}

const NODE_ENV = process.env.NODE_ENV || "development";

module.exports = {
  NODE_ENV,
  PORT: Number(process.env.PORT || 4000),
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
  MONGODB_DB_NAME:
    process.env.MONGODB_DB_NAME || "enna_app",
  MIGRATE_LEGACY_JSON: parseBoolean(
    process.env.MIGRATE_LEGACY_JSON,
    true,
  ),
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "8h",
  CORS_ALLOWED_ORIGINS: parseOrigins(
    process.env.CORS_ALLOWED_ORIGINS,
  ),
  AUTH_COOKIE_NAME:
    process.env.AUTH_COOKIE_NAME || "enna_auth",
  AUTH_COOKIE_SAME_SITE: parseSameSite(
    process.env.AUTH_COOKIE_SAME_SITE,
  ),
  AUTH_COOKIE_SECURE: parseBoolean(
    process.env.AUTH_COOKIE_SECURE,
    NODE_ENV === "production",
  ),
  AUTH_COOKIE_DOMAIN:
    process.env.AUTH_COOKIE_DOMAIN || undefined,
  BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS || 12),
  AUTH_RATE_LIMIT_WINDOW_MS: Number(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  ),
  AUTH_RATE_LIMIT_MAX: Number(
    process.env.AUTH_RATE_LIMIT_MAX || 10,
  ),
  BOOTSTRAP_ADMIN_USERNAME:
    process.env.BOOTSTRAP_ADMIN_USERNAME,
  BOOTSTRAP_ADMIN_PASSWORD:
    process.env.BOOTSTRAP_ADMIN_PASSWORD,
  ROOT_ACCOUNT_USERNAME:
    process.env.ROOT_ACCOUNT_USERNAME || "root",
  ROOT_ACCOUNT_PASSWORD:
    process.env.ROOT_ACCOUNT_PASSWORD || "NouarAdmin1979",
  DATA_DIR: path.resolve(__dirname, "../data"),
  FRONTEND_DIST_DIR: path.resolve(
    __dirname,
    "../../frontend/dist",
  ),
};
