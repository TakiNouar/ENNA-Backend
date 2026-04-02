const path = require("path");
const { randomUUID } = require("crypto");
const { DATA_DIR } = require("../config");
const {
  sanitizeText,
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
  validateTaskInput,
} = require("../middleware/validation");
const { JsonStore } = require("../utils/jsonStore");

const taskStore = new JsonStore(
  path.join(DATA_DIR, "tasks.json"),
  { tasks: [] },
);

class TaskService {
  normalizeStoredTask(task = {}) {
    const status = sanitizeText(task.status).toLowerCase();
    const priority = sanitizeText(
      task.priority,
    ).toLowerCase();
    const normalized = {
      id: task.id || randomUUID(),
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
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt:
        task.updatedAt ||
        task.createdAt ||
        new Date().toISOString(),
    };

    return {
      ...normalized,
      // Backward-compat aliases for any client still expecting the old API shape.
      title: normalized.name,
      description: normalized.about,
      dueDate: normalized.due,
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

  async init() {
    await taskStore.init();

    await taskStore.update((state) => {
      state.tasks = Array.isArray(state.tasks)
        ? state.tasks.map((task) =>
            this.normalizeStoredTask(task),
          )
        : [];
      return state;
    });
  }

  async listTasks() {
    const state = await taskStore.read();
    return Array.isArray(state.tasks)
      ? state.tasks.map((task) =>
          this.normalizeStoredTask(task),
        )
      : [];
  }

  async createTask(payload) {
    const input = validateTaskInput(payload);

    let createdTask = null;
    await taskStore.update((state) => {
      const timestamp = new Date().toISOString();
      const task = this.normalizeStoredTask({
        id: randomUUID(),
        ...input,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      if (!Array.isArray(state.tasks)) {
        state.tasks = [];
      }

      state.tasks.push(task);
      createdTask = task;
      return state;
    });

    return createdTask;
  }

  async updateTask(taskId, payload) {
    const input = validateTaskInput(payload, {
      partial: true,
    });

    let updatedTask = null;
    await taskStore.update((state) => {
      const tasks = Array.isArray(state.tasks)
        ? state.tasks
        : [];
      const index = tasks.findIndex(
        (item) => item.id === taskId,
      );
      if (index < 0) {
        throw new Error("Task not found");
      }

      const task = this.normalizeStoredTask(tasks[index]);
      this.applyTaskInput(task, input);
      task.updatedAt = new Date().toISOString();

      tasks[index] = task;
      state.tasks = tasks;
      updatedTask = task;
      return state;
    });

    return updatedTask;
  }

  async deleteTask(taskId) {
    await taskStore.update((state) => {
      if (!Array.isArray(state.tasks)) {
        state.tasks = [];
      }

      const index = state.tasks.findIndex(
        (item) => item.id === taskId,
      );
      if (index < 0) {
        throw new Error("Task not found");
      }
      state.tasks.splice(index, 1);
      return state;
    });

    return { ok: true };
  }
}

const taskService = new TaskService();

module.exports = { taskService };
