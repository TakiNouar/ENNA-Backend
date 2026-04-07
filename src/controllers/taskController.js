const { taskService } = require("../services/taskService");

async function listTasks(req, res, next) {
  try {
    const tasks = await taskService.listTasks();
    return res.json({ tasks });
  } catch (error) {
    return next(error);
  }
}

async function createTask(req, res, next) {
  try {
    const task = await taskService.createTask(
      req.body,
      req.user,
    );
    return res.status(201).json({ task });
  } catch (error) {
    return next(error);
  }
}

async function updateTask(req, res, next) {
  try {
    const task = await taskService.updateTask(
      req.params.taskId,
      req.body,
      req.user,
    );
    return res.json({ task });
  } catch (error) {
    return next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    await taskService.deleteTask(req.params.taskId);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
};
