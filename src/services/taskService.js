const { randomUUID } = require("crypto");
const {
  sanitizeText,
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
  validateTaskInput,
} = require("../middleware/validation");
const { Task } = require("../models/Task");

function toIsoString(value) {
  if (!value) {
    return new Date().toISOString();
  }

  const date =
    value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function resolveActorUsername(actor) {
  return sanitizeText(actor?.username);
}

class TaskService {
  normalizeStoredTask(task = {}) {
    const status = sanitizeText(task.status).toLowerCase();
    const priority = sanitizeText(
      task.priority,
    ).toLowerCase();
    const normalized = {
      id: sanitizeText(task.id) || randomUUID(),
      entryId: sanitizeText(task.entryId),
      num: sanitizeText(task.num),
      name: sanitizeText(task.name || task.title),
      about: sanitizeText(task.about || task.description),
      priority: TASK_PRIORITY_VALUES.includes(priority)
        ? priority
        : "medium",
      status: TASK_STATUS_VALUES.includes(status)
        ? status
        : "todo",
      due: sanitizeText(task.due || task.dueDate),
      missionMgr: sanitizeText(task.missionMgr),
      mailDate: sanitizeText(task.mailDate),
      procDate: sanitizeText(task.procDate),
      responsible: sanitizeText(task.responsible),
      synthese: sanitizeText(task.synthese),
      obs: sanitizeText(task.obs),
      createdAt: toIsoString(task.createdAt),
      updatedAt: toIsoString(
        task.updatedAt || task.createdAt,
      ),
    };

    return {
      ...normalized,
      // Backward-compat aliases for any client still expecting the old API shape.
      title: normalized.name,
      description: normalized.about,
      dueDate: normalized.due,
    };
  }

  toPersistenceTask(task) {
    return {
      id: task.id,
      entryId: task.entryId,
      num: task.num,
      name: task.name,
      about: task.about,
      priority: task.priority,
      status: task.status,
      due: task.due,
      missionMgr: task.missionMgr,
      mailDate: task.mailDate,
      procDate: task.procDate,
      responsible: task.responsible,
      synthese: task.synthese,
      obs: task.obs,
      createdAt: new Date(task.createdAt),
      updatedAt: new Date(task.updatedAt),
    };
  }

  applyTaskInput(task, input) {
    if (
      Object.prototype.hasOwnProperty.call(input, "num")
    ) {
      task.num = input.num;
    }
    if (
      Object.prototype.hasOwnProperty.call(input, "name")
    ) {
      task.name = input.name;
    }
    if (
      Object.prototype.hasOwnProperty.call(input, "about")
    ) {
      task.about = input.about;
    }
    if (
      Object.prototype.hasOwnProperty.call(
        input,
        "priority",
      )
    ) {
      task.priority = input.priority;
    }
    if (
      Object.prototype.hasOwnProperty.call(input, "status")
    ) {
      task.status = input.status;
    }
    if (
      Object.prototype.hasOwnProperty.call(input, "due")
    ) {
      task.due = input.due;
    }
    if (
      Object.prototype.hasOwnProperty.call(
        input,
        "missionMgr",
      )
    ) {
      task.missionMgr = input.missionMgr;
    }
    if (
      Object.prototype.hasOwnProperty.call(
        input,
        "mailDate",
      )
    ) {
      task.mailDate = input.mailDate;
    }
    if (
      Object.prototype.hasOwnProperty.call(
        input,
        "procDate",
      )
    ) {
      task.procDate = input.procDate;
    }
    if (
      Object.prototype.hasOwnProperty.call(
        input,
        "responsible",
      )
    ) {
      task.responsible = input.responsible;
    }
    if (
      Object.prototype.hasOwnProperty.call(
        input,
        "synthese",
      )
    ) {
      task.synthese = input.synthese;
    }
    if (
      Object.prototype.hasOwnProperty.call(input, "obs")
    ) {
      task.obs = input.obs;
    }

    task.title = task.name;
    task.description = task.about;
    task.dueDate = task.due;
  }

  async init() {}

  async listTasks() {
    const tasks = await Task.find({}, null, {
      sort: { createdAt: 1 },
    }).lean();

    return tasks.map((task) =>
      this.normalizeStoredTask(task),
    );
  }

  async createTask(payload, actor) {
    const input = validateTaskInput(payload);
    const entryId = resolveActorUsername(actor);

    const timestamp = new Date().toISOString();
    const task = this.normalizeStoredTask({
      id: randomUUID(),
      entryId,
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await Task.create(this.toPersistenceTask(task));

    return task;
  }

  async updateTask(taskId, payload, actor) {
    const input = validateTaskInput(payload, {
      partial: true,
    });

    const existingTask = await Task.findOne({
      id: taskId,
    }).lean();
    if (!existingTask) {
      throw new Error("Task not found");
    }

    const task = this.normalizeStoredTask(existingTask);
    this.applyTaskInput(task, input);
    task.entryId = resolveActorUsername(actor);
    task.updatedAt = new Date().toISOString();

    await Task.updateOne(
      { id: taskId },
      this.toPersistenceTask(task),
    );

    return task;
  }

  async deleteTask(taskId) {
    const result = await Task.deleteOne({
      id: taskId,
    });
    if (!result.deletedCount) {
      throw new Error("Task not found");
    }

    return { ok: true };
  }
}

const taskService = new TaskService();

module.exports = { taskService };
