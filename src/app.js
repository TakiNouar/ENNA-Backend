const fs = require("fs");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const express = require("express");
const helmet = require("helmet");
const {
  CORS_ALLOWED_ORIGINS,
  FRONTEND_DIST_DIR,
  NODE_ENV,
} = require("./config");
const { requireAuth } = require("./middleware/auth");
const { requireRole } = require("./middleware/requireRole");
const accountRoutes = require("./routes/accountRoutes");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");

const app = express();

if (NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

if (CORS_ALLOWED_ORIGINS.length > 0) {
  const corsOptions = {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (CORS_ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked for origin: ${origin}`),
      );
    },
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
}

app.use(cookieParser());
app.use(express.json({ limit: "16kb" }));

app.use("/api/auth", authRoutes);
app.use("/api/tasks", requireAuth, taskRoutes);
app.use(
  "/api/admin/accounts",
  requireAuth,
  requireRole("admin", "root"),
  accountRoutes,
);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

if (fs.existsSync(FRONTEND_DIST_DIR)) {
  app.use(express.static(FRONTEND_DIST_DIR));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    return res.sendFile(
      path.join(FRONTEND_DIST_DIR, "index.html"),
    );
  });
} else {
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    return res
      .status(503)
      .send(
        "Frontend build not found. Run: npm --prefix frontend run build",
      );
  });
}

app.use((err, req, res, next) => {
  const status = /not found/i.test(err.message) ? 404 : 400;
  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }
  res
    .status(status)
    .json({ error: err.message || "Unexpected error" });
});

module.exports = { app };
