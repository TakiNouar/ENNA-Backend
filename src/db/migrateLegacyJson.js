const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const {
  DATA_DIR,
  MIGRATE_LEGACY_JSON,
} = require("../config");
const { Account } = require("../models/Account");
const {
  Communication,
} = require("../models/Communication");
const { Meeting } = require("../models/Meeting");
const { Task } = require("../models/Task");
const {
  COMMUNICATION_STATUS_VALUES,
  COMMUNICATION_TYPE_VALUES,
  sanitizeText,
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
  validateUserType,
  validateRole,
  validateUsername,
} = require("../middleware/validation");

function parseDate(value, fallback = new Date()) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed;
}

async function loadLegacyCollection(fileName, key) {
  const targetPath = path.join(DATA_DIR, fileName);

  try {
    const raw = await fs.readFile(targetPath, "utf8");
    const parsed = JSON.parse(raw);
    const collection = parsed?.data?.[key];
    return Array.isArray(collection) ? collection : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function normalizeLegacyAccount(legacyAccount = {}) {
  const username = validateUsername(legacyAccount.username);
  const roleInput = sanitizeText(
    legacyAccount.role,
  ).toLowerCase();
  const role =
    roleInput === "root" ? "root" : validateRole(roleInput);
  const passwordHash = String(
    legacyAccount.passwordHash || "",
  ).trim();

  if (!passwordHash) {
    throw new Error("Missing password hash");
  }

  const createdAt = parseDate(legacyAccount.createdAt);

  return {
    id: sanitizeText(legacyAccount.id) || randomUUID(),
    username,
    usernameLower: username.toLowerCase(),
    role,
    type:
      role === "root" || role === "admin"
        ? "global"
        : legacyAccount.type
          ? validateUserType(legacyAccount.type)
          : "none",
    passwordHash,
    createdAt,
    updatedAt: parseDate(
      legacyAccount.updatedAt,
      createdAt,
    ),
  };
}

function normalizeLegacyCommunication(
  legacyCommunication = {},
) {
  const rawType = sanitizeText(
    legacyCommunication.type,
  ).toLowerCase();
  const type =
    rawType === "radar" ? "surveillance" : rawType;
  const status = sanitizeText(
    legacyCommunication.status,
  ).toLowerCase();
  const createdAt = parseDate(
    legacyCommunication.createdAt,
  );

  return {
    id:
      sanitizeText(legacyCommunication.id) || randomUUID(),
    number: sanitizeText(legacyCommunication.number),
    type: COMMUNICATION_TYPE_VALUES.includes(type)
      ? type
      : "surveillance",
    status: COMMUNICATION_STATUS_VALUES.includes(status)
      ? status
      : "active",
    site: sanitizeText(legacyCommunication.site),
    equipment: sanitizeText(legacyCommunication.equipment),
    date: sanitizeText(legacyCommunication.date),
    observation: sanitizeText(
      legacyCommunication.observation ||
        legacyCommunication.obs,
    ),
    createdAt,
    updatedAt: parseDate(
      legacyCommunication.updatedAt,
      createdAt,
    ),
  };
}

function normalizeLegacyTask(legacyTask = {}) {
  const status = sanitizeText(
    legacyTask.status,
  ).toLowerCase();
  const priority = sanitizeText(
    legacyTask.priority,
  ).toLowerCase();
  const createdAt = parseDate(legacyTask.createdAt);

  return {
    id: sanitizeText(legacyTask.id) || randomUUID(),
    num: sanitizeText(legacyTask.num),
    name: sanitizeText(legacyTask.name || legacyTask.title),
    about: sanitizeText(
      legacyTask.about || legacyTask.description,
    ),
    priority: TASK_PRIORITY_VALUES.includes(priority)
      ? priority
      : "medium",
    status: TASK_STATUS_VALUES.includes(status)
      ? status
      : "todo",
    due: sanitizeText(legacyTask.due || legacyTask.dueDate),
    missionMgr: sanitizeText(legacyTask.missionMgr),
    mailDate: sanitizeText(legacyTask.mailDate),
    procDate: sanitizeText(legacyTask.procDate),
    responsible: sanitizeText(legacyTask.responsible),
    synthese: sanitizeText(legacyTask.synthese),
    obs: sanitizeText(legacyTask.obs),
    createdAt,
    updatedAt: parseDate(legacyTask.updatedAt, createdAt),
  };
}

function normalizeLegacyMeeting(legacyMeeting = {}) {
  const status = sanitizeText(
    legacyMeeting.status,
  ).toLowerCase();
  const priority = sanitizeText(
    legacyMeeting.priority,
  ).toLowerCase();
  const dateTime = parseDate(
    legacyMeeting.dateTime || legacyMeeting.date,
  );
  const createdAt = parseDate(
    legacyMeeting.createdAt,
    dateTime,
  );

  return {
    id: sanitizeText(legacyMeeting.id) || randomUUID(),
    number: sanitizeText(
      legacyMeeting.number || legacyMeeting.num,
    ),
    subject: sanitizeText(
      legacyMeeting.subject ||
        legacyMeeting.name ||
        legacyMeeting.title,
    ),
    priority: TASK_PRIORITY_VALUES.includes(priority)
      ? priority
      : "medium",
    status: TASK_STATUS_VALUES.includes(status)
      ? status
      : "todo",
    dateTime,
    with: sanitizeText(legacyMeeting.with),
    note: sanitizeText(
      legacyMeeting.note ||
        legacyMeeting.obs ||
        legacyMeeting.description,
    ),
    createdAt,
    updatedAt: parseDate(
      legacyMeeting.updatedAt,
      createdAt,
    ),
  };
}

async function migrateAccounts() {
  const accountCount = await Account.countDocuments();
  if (accountCount > 0) {
    return;
  }

  const legacyAccounts = await loadLegacyCollection(
    "accounts.json",
    "accounts",
  );
  if (legacyAccounts.length === 0) {
    return;
  }

  const nextAccounts = [];
  for (const legacyAccount of legacyAccounts) {
    try {
      nextAccounts.push(
        normalizeLegacyAccount(legacyAccount),
      );
    } catch (error) {
      console.warn(
        "Skipping invalid legacy account entry:",
        error.message,
      );
    }
  }

  if (nextAccounts.length === 0) {
    return;
  }

  try {
    await Account.insertMany(nextAccounts, {
      ordered: false,
    });
  } catch (error) {
    if (!error?.writeErrors) {
      throw error;
    }
  }

  console.log(
    `Migrated ${nextAccounts.length} account(s) from JSON data.`,
  );
}

async function migrateTasks() {
  const taskCount = await Task.countDocuments();
  if (taskCount > 0) {
    return;
  }

  const legacyTasks = await loadLegacyCollection(
    "tasks.json",
    "tasks",
  );
  if (legacyTasks.length === 0) {
    return;
  }

  const nextTasks = [];
  for (const legacyTask of legacyTasks) {
    try {
      nextTasks.push(normalizeLegacyTask(legacyTask));
    } catch (error) {
      console.warn(
        "Skipping invalid legacy task entry:",
        error.message,
      );
    }
  }

  if (nextTasks.length === 0) {
    return;
  }

  try {
    await Task.insertMany(nextTasks, {
      ordered: false,
    });
  } catch (error) {
    if (!error?.writeErrors) {
      throw error;
    }
  }

  console.log(
    `Migrated ${nextTasks.length} task(s) from JSON data.`,
  );
}

async function migrateMeetings() {
  const meetingCount = await Meeting.countDocuments();
  if (meetingCount > 0) {
    return;
  }

  const legacyMeetings = await loadLegacyCollection(
    "meetings.json",
    "meetings",
  );
  if (legacyMeetings.length === 0) {
    return;
  }

  const nextMeetings = [];
  for (const legacyMeeting of legacyMeetings) {
    try {
      nextMeetings.push(
        normalizeLegacyMeeting(legacyMeeting),
      );
    } catch (error) {
      console.warn(
        "Skipping invalid legacy meeting entry:",
        error.message,
      );
    }
  }

  if (nextMeetings.length === 0) {
    return;
  }

  try {
    await Meeting.insertMany(nextMeetings, {
      ordered: false,
    });
  } catch (error) {
    if (!error?.writeErrors) {
      throw error;
    }
  }

  console.log(
    `Migrated ${nextMeetings.length} meeting(s) from JSON data.`,
  );
}

async function migrateCommunications() {
  const communicationCount =
    await Communication.countDocuments();
  if (communicationCount > 0) {
    return;
  }

  const legacyCommunications = await loadLegacyCollection(
    "communications.json",
    "communications",
  );
  if (legacyCommunications.length === 0) {
    return;
  }

  const nextCommunications = [];
  for (const legacyCommunication of legacyCommunications) {
    try {
      nextCommunications.push(
        normalizeLegacyCommunication(legacyCommunication),
      );
    } catch (error) {
      console.warn(
        "Skipping invalid legacy communication entry:",
        error.message,
      );
    }
  }

  if (nextCommunications.length === 0) {
    return;
  }

  try {
    await Communication.insertMany(nextCommunications, {
      ordered: false,
    });
  } catch (error) {
    if (!error?.writeErrors) {
      throw error;
    }
  }

  console.log(
    `Migrated ${nextCommunications.length} communication(s) from JSON data.`,
  );
}

async function migrateLegacyJsonData() {
  if (!MIGRATE_LEGACY_JSON) {
    return;
  }

  await migrateAccounts();
  await migrateTasks();
  await migrateMeetings();
  await migrateCommunications();
}

module.exports = { migrateLegacyJsonData };
