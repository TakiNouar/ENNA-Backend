const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Load local env files when present (Render dashboard env vars still win).
const envFiles = [
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../.env.render"),
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }
}

const { PORT } = require("./config");
const { app } = require("./app");
const { connectToDatabase } = require("./db/mongoose");
const {
  migrateLegacyJsonData,
} = require("./db/migrateLegacyJson");
const {
  accountService,
} = require("./services/accountService");
const {
  meetingService,
} = require("./services/meetingService");
const {
  communicationService,
} = require("./services/communicationService");
const { taskService } = require("./services/taskService");

async function start() {
  await connectToDatabase();
  await migrateLegacyJsonData();
  await accountService.init();
  await meetingService.init();
  await communicationService.init();
  await taskService.init();

  app.listen(PORT, () => {
    console.log(
      `Backend listening on http://localhost:${PORT}`,
    );
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
