const ROLE_VALUES = ["admin", "user"];
const TASK_STATUS_VALUES = [
  "todo",
  "inprogress",
  "done",
  "cancelled",
];
const TASK_PRIORITY_VALUES = ["high", "medium", "low"];

function sanitizeText(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

function validateUsername(value) {
  const username = sanitizeText(value);
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
    throw new Error(
      "Username must be 3-32 characters and only contain letters, numbers, _, ., or -",
    );
  }
  return username;
}

function validatePassword(value) {
  if (
    typeof value !== "string" ||
    value.length < 10 ||
    value.length > 128
  ) {
    throw new Error(
      "Password must be between 10 and 128 characters",
    );
  }
  return value;
}

function validateRole(value) {
  const role = sanitizeText(value).toLowerCase();
  if (!ROLE_VALUES.includes(role)) {
    throw new Error("Role must be either admin or user");
  }
  return role;
}

function validateTaskStatus(value) {
  const status = sanitizeText(value).toLowerCase();
  if (!TASK_STATUS_VALUES.includes(status)) {
    throw new Error("Invalid task status");
  }
  return status;
}

function validateTaskPriority(value) {
  const priority = sanitizeText(value).toLowerCase();
  if (!TASK_PRIORITY_VALUES.includes(priority)) {
    throw new Error("Invalid task priority");
  }
  return priority;
}

function validateDateField(value, fieldName) {
  const dateValue = sanitizeText(value || "");
  if (dateValue && !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    throw new Error(
      `${fieldName} must be in YYYY-MM-DD format`,
    );
  }
  return dateValue;
}

function normalizeDateTimeField(value, fieldName) {
  const text = sanitizeText(value || "");
  if (!text) {
    throw new Error(`${fieldName} is required`);
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      `${fieldName} must be a valid date/time`,
    );
  }

  return parsed.toISOString();
}

function validateTaskInput(
  input = {},
  { partial = false } = {},
) {
  const has = (key) =>
    Object.prototype.hasOwnProperty.call(input, key);

  const shouldValidateNum = !partial || has("num");
  const shouldValidateName =
    !partial || has("name") || has("title");
  const shouldValidateAbout =
    !partial || has("about") || has("description");
  const shouldValidatePriority =
    !partial || has("priority");
  const shouldValidateStatus = !partial || has("status");
  const shouldValidateDue =
    !partial || has("due") || has("dueDate");
  const shouldValidateMissionMgr =
    !partial || has("missionMgr");
  const shouldValidateMailDate =
    !partial || has("mailDate");
  const shouldValidateProcDate =
    !partial || has("procDate");
  const shouldValidateResponsible =
    !partial || has("responsible");
  const shouldValidateSynthese =
    !partial || has("synthese");
  const shouldValidateObs = !partial || has("obs");

  const result = {};

  if (shouldValidateNum) {
    const num = sanitizeText(input.num || "");
    if (num.length < 1 || num.length > 40) {
      throw new Error(
        "Task number must be between 1 and 40 characters",
      );
    }
    result.num = num;
  }

  if (shouldValidateName) {
    const name = sanitizeText(
      input.name || input.title || "",
    );
    if (name.length < 3 || name.length > 180) {
      throw new Error(
        "Task name must be between 3 and 180 characters",
      );
    }
    result.name = name;
  }

  if (shouldValidateAbout) {
    const about = sanitizeText(
      input.about || input.description || "",
    );
    if (about.length > 3000) {
      throw new Error("Task description is too long");
    }
    result.about = about;
  }

  if (shouldValidatePriority) {
    result.priority = has("priority")
      ? validateTaskPriority(input.priority)
      : "medium";
  }

  if (shouldValidateStatus) {
    result.status = has("status")
      ? validateTaskStatus(input.status)
      : "todo";
  }

  if (shouldValidateDue) {
    const due = validateDateField(
      has("due") ? input.due : input.dueDate,
      "Due date",
    );
    if (!partial && !due) {
      throw new Error("Due date is required");
    }
    result.due = due;
  }

  if (shouldValidateMissionMgr) {
    const missionMgr = sanitizeText(input.missionMgr || "");
    if (missionMgr.length > 120) {
      throw new Error("Mission manager is too long");
    }
    result.missionMgr = missionMgr;
  }

  if (shouldValidateMailDate) {
    result.mailDate = validateDateField(
      input.mailDate,
      "Mail date",
    );
  }

  if (shouldValidateProcDate) {
    result.procDate = validateDateField(
      input.procDate,
      "Process date",
    );
  }

  if (shouldValidateResponsible) {
    const responsible = sanitizeText(
      input.responsible || "",
    );
    if (responsible.length > 120) {
      throw new Error("Responsible is too long");
    }
    result.responsible = responsible;
  }

  if (shouldValidateSynthese) {
    const synthese = sanitizeText(input.synthese || "");
    if (synthese.length > 4000) {
      throw new Error("Synthesis is too long");
    }
    result.synthese = synthese;
  }

  if (shouldValidateObs) {
    const obs = sanitizeText(input.obs || "");
    if (obs.length > 2000) {
      throw new Error("Observation is too long");
    }
    result.obs = obs;
  }

  return result;
}

function validateMeetingInput(
  input = {},
  { partial = false } = {},
) {
  const has = (key) =>
    Object.prototype.hasOwnProperty.call(input, key);

  const shouldValidateNumber = has("number") || has("num");
  const shouldValidateSubject =
    !partial ||
    has("subject") ||
    has("name") ||
    has("title");
  const shouldValidateDateTime =
    !partial || has("dateTime") || has("date");
  const shouldValidateWith = !partial || has("with");
  const shouldValidateNote =
    !partial ||
    has("note") ||
    has("obs") ||
    has("description");

  const result = {};

  if (shouldValidateNumber) {
    const number = sanitizeText(
      input.number || input.num || "",
    );
    if (!number) {
      throw new Error(
        "Meeting number cannot be empty when provided",
      );
    }
    if (number.length > 40) {
      throw new Error(
        "Meeting number must be at most 40 characters",
      );
    }
    result.number = number;
  }

  if (shouldValidateSubject) {
    const subject = sanitizeText(
      input.subject || input.name || input.title || "",
    );
    if (subject.length < 3 || subject.length > 180) {
      throw new Error(
        "Meeting subject must be between 3 and 180 characters",
      );
    }
    result.subject = subject;
  }

  if (shouldValidateDateTime) {
    const dateTimeInput = has("dateTime")
      ? input.dateTime
      : input.date;

    if (partial && !has("dateTime") && !has("date")) {
      // No-op for partial update when field is omitted.
    } else {
      result.dateTime = normalizeDateTimeField(
        dateTimeInput,
        "Meeting date/time",
      );
    }
  }

  if (shouldValidateWith) {
    const withValue = sanitizeText(input.with || "");
    if (withValue.length > 120) {
      throw new Error("Meeting with-field is too long");
    }
    result.with = withValue;
  }

  if (shouldValidateNote) {
    const note = sanitizeText(
      input.note || input.obs || input.description || "",
    );
    if (note.length > 2000) {
      throw new Error("Meeting note is too long");
    }
    result.note = note;
  }

  return result;
}

module.exports = {
  ROLE_VALUES,
  TASK_STATUS_VALUES,
  TASK_PRIORITY_VALUES,
  sanitizeText,
  validateUsername,
  validatePassword,
  validateRole,
  validateTaskInput,
  validateMeetingInput,
};
