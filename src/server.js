const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const { PORT } = require("./config");
const { app } = require("./app");
const {
  accountService,
} = require("./services/accountService");
const { taskService } = require("./services/taskService");

async function start() {
  await accountService.init();
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
