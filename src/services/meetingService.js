const { randomUUID } = require("crypto");
const {
  sanitizeText,
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
  validateMeetingInput,
} = require("../middleware/validation");
const { Meeting } = require("../models/Meeting");

const MEETING_NUMBER_PREFIX = "M-";

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

class MeetingService {
  extractMeetingSequence(value) {
    const text = sanitizeText(value);
    if (!text) {
      return null;
    }

    const match = text.match(/(\d+)$/);
    if (!match) {
      return null;
    }

    const sequence = Number.parseInt(match[1], 10);
    if (!Number.isFinite(sequence) || sequence <= 0) {
      return null;
    }

    return sequence;
  }

  formatMeetingNumber(sequence) {
    return `${MEETING_NUMBER_PREFIX}${String(sequence).padStart(3, "0")}`;
  }

  async getNextMeetingNumber() {
    const meetings = await Meeting.find(
      {},
      { number: 1 },
    ).lean();

    let maxSequence = 0;
    for (const meeting of meetings) {
      const sequence = this.extractMeetingSequence(
        meeting.number,
      );
      if (sequence && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }

    return this.formatMeetingNumber(maxSequence + 1);
  }

  async ensureMeetingNumbers() {
    const meetings = await Meeting.find(
      {},
      { number: 1, createdAt: 1 },
    )
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    if (meetings.length === 0) {
      return;
    }

    let maxSequence = 0;
    for (const meeting of meetings) {
      const sequence = this.extractMeetingSequence(
        meeting.number,
      );
      if (sequence && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }

    const updates = [];
    for (const meeting of meetings) {
      const sequence = this.extractMeetingSequence(
        meeting.number,
      );
      if (sequence) {
        continue;
      }

      maxSequence += 1;
      updates.push({
        updateOne: {
          filter: { _id: meeting._id },
          update: {
            $set: {
              number: this.formatMeetingNumber(maxSequence),
            },
          },
        },
      });
    }

    if (updates.length > 0) {
      await Meeting.bulkWrite(updates);
    }
  }

  normalizeStoredMeeting(meeting = {}) {
    const priority = sanitizeText(
      meeting.priority,
    ).toLowerCase();
    const status = sanitizeText(
      meeting.status,
    ).toLowerCase();

    return {
      id: sanitizeText(meeting.id) || randomUUID(),
      number: sanitizeText(meeting.number || meeting.num),
      subject: sanitizeText(
        meeting.subject || meeting.name || meeting.title,
      ),
      priority: TASK_PRIORITY_VALUES.includes(priority)
        ? priority
        : "medium",
      status: TASK_STATUS_VALUES.includes(status)
        ? status
        : "todo",
      dateTime: toIsoString(meeting.dateTime),
      with: sanitizeText(meeting.with),
      note: sanitizeText(
        meeting.note || meeting.obs || meeting.description,
      ),
      createdAt: toIsoString(meeting.createdAt),
      updatedAt: toIsoString(
        meeting.updatedAt || meeting.createdAt,
      ),
    };
  }

  toPersistenceMeeting(meeting) {
    return {
      id: meeting.id,
      number: meeting.number,
      subject: meeting.subject,
      priority: meeting.priority,
      status: meeting.status,
      dateTime: new Date(meeting.dateTime),
      with: meeting.with,
      note: meeting.note,
      createdAt: new Date(meeting.createdAt),
      updatedAt: new Date(meeting.updatedAt),
    };
  }

  applyMeetingInput(meeting, input) {
    if (
      Object.prototype.hasOwnProperty.call(input, "number")
    ) {
      meeting.number = input.number;
    }

    if (
      Object.prototype.hasOwnProperty.call(input, "subject")
    ) {
      meeting.subject = input.subject;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        input,
        "priority",
      )
    ) {
      meeting.priority = input.priority;
    }

    if (
      Object.prototype.hasOwnProperty.call(input, "status")
    ) {
      meeting.status = input.status;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        input,
        "dateTime",
      )
    ) {
      meeting.dateTime = input.dateTime;
    }

    if (
      Object.prototype.hasOwnProperty.call(input, "with")
    ) {
      meeting.with = input.with;
    }

    if (
      Object.prototype.hasOwnProperty.call(input, "note")
    ) {
      meeting.note = input.note;
    }
  }

  async init() {
    await this.ensureMeetingNumbers();
  }

  async listMeetings() {
    const meetings = await Meeting.find({}, null, {
      sort: { dateTime: 1 },
    }).lean();

    return meetings.map((meeting) =>
      this.normalizeStoredMeeting(meeting),
    );
  }

  async createMeeting(payload) {
    const input = validateMeetingInput(payload);
    const autoNumber = await this.getNextMeetingNumber();

    const timestamp = new Date().toISOString();
    const meeting = this.normalizeStoredMeeting({
      id: randomUUID(),
      ...input,
      number: input.number || autoNumber,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await Meeting.create(
      this.toPersistenceMeeting(meeting),
    );

    return meeting;
  }

  async updateMeeting(meetingId, payload) {
    const input = validateMeetingInput(payload, {
      partial: true,
    });

    const existingMeeting = await Meeting.findOne({
      id: meetingId,
    }).lean();
    if (!existingMeeting) {
      throw new Error("Meeting not found");
    }

    const meeting =
      this.normalizeStoredMeeting(existingMeeting);
    this.applyMeetingInput(meeting, input);
    meeting.updatedAt = new Date().toISOString();

    await Meeting.updateOne(
      { id: meetingId },
      this.toPersistenceMeeting(meeting),
    );

    return meeting;
  }

  async deleteMeeting(meetingId) {
    const result = await Meeting.deleteOne({
      id: meetingId,
    });
    if (!result.deletedCount) {
      throw new Error("Meeting not found");
    }

    return { ok: true };
  }
}

const meetingService = new MeetingService();

module.exports = { meetingService };
