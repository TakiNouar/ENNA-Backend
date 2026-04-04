const { randomUUID } = require("crypto");
const {
  canAccessCommunications,
  canMutateCommunicationType,
  resolveCommunicationTypeScope,
} = require("../middleware/permissions");
const {
  COMMUNICATION_TYPE_VALUES,
  COMMUNICATION_STATUS_VALUES,
  sanitizeText,
  validateCommunicationInput,
} = require("../middleware/validation");
const {
  Communication,
} = require("../models/Communication");

const COMMUNICATION_NUMBER_PREFIX = "C-";

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

class CommunicationService {
  extractCommunicationSequence(value) {
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

  formatCommunicationNumber(sequence) {
    return `${COMMUNICATION_NUMBER_PREFIX}${String(sequence).padStart(3, "0")}`;
  }

  async getNextCommunicationNumber() {
    const rows = await Communication.find(
      {},
      { number: 1 },
    ).lean();

    let maxSequence = 0;
    for (const row of rows) {
      const sequence = this.extractCommunicationSequence(
        row.number,
      );
      if (sequence && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }

    return this.formatCommunicationNumber(maxSequence + 1);
  }

  async ensureCommunicationNumbers() {
    const rows = await Communication.find(
      {},
      { number: 1, createdAt: 1 },
    )
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    if (rows.length === 0) {
      return;
    }

    let maxSequence = 0;
    for (const row of rows) {
      const sequence = this.extractCommunicationSequence(
        row.number,
      );
      if (sequence && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }

    const updates = [];
    for (const row of rows) {
      const sequence = this.extractCommunicationSequence(
        row.number,
      );
      if (sequence) {
        continue;
      }

      maxSequence += 1;
      updates.push({
        updateOne: {
          filter: { _id: row._id },
          update: {
            $set: {
              number:
                this.formatCommunicationNumber(maxSequence),
            },
          },
        },
      });
    }

    if (updates.length > 0) {
      await Communication.bulkWrite(updates);
    }
  }

  normalizeStoredCommunication(row = {}) {
    const type = sanitizeText(row.type).toLowerCase();
    const status = sanitizeText(row.status).toLowerCase();

    return {
      id: sanitizeText(row.id) || randomUUID(),
      number: sanitizeText(row.number),
      type: COMMUNICATION_TYPE_VALUES.includes(type)
        ? type
        : "radar",
      status: COMMUNICATION_STATUS_VALUES.includes(status)
        ? status
        : "active",
      site: sanitizeText(row.site),
      equipment: sanitizeText(row.equipment),
      date: sanitizeText(row.date),
      observation: sanitizeText(row.observation || row.obs),
      createdAt: toIsoString(row.createdAt),
      updatedAt: toIsoString(
        row.updatedAt || row.createdAt,
      ),
    };
  }

  toPersistenceCommunication(row) {
    return {
      id: row.id,
      number: row.number,
      type: row.type,
      status: row.status,
      site: row.site,
      equipment: row.equipment,
      date: row.date,
      observation: row.observation,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  applyCommunicationInput(row, input) {
    if (
      Object.prototype.hasOwnProperty.call(input, "type")
    ) {
      row.type = input.type;
    }
    if (
      Object.prototype.hasOwnProperty.call(input, "status")
    ) {
      row.status = input.status;
    }
    if (
      Object.prototype.hasOwnProperty.call(input, "site")
    ) {
      row.site = input.site;
    }
    if (
      Object.prototype.hasOwnProperty.call(
        input,
        "equipment",
      )
    ) {
      row.equipment = input.equipment;
    }
    if (
      Object.prototype.hasOwnProperty.call(input, "date")
    ) {
      row.date = input.date;
    }
    if (
      Object.prototype.hasOwnProperty.call(
        input,
        "observation",
      )
    ) {
      row.observation = input.observation;
    }
  }

  validateListScope(user, requestedType) {
    if (!canAccessCommunications(user)) {
      throw new Error("Forbidden");
    }

    const userScope = resolveCommunicationTypeScope(user);
    if (userScope === "none") {
      throw new Error("Forbidden");
    }

    const normalizedType =
      sanitizeText(requestedType).toLowerCase();
    const hasRequestedType =
      COMMUNICATION_TYPE_VALUES.includes(normalizedType);

    if (userScope && hasRequestedType) {
      if (normalizedType !== userScope) {
        throw new Error(
          "Forbidden: this communication type is outside your scope",
        );
      }
      return { type: normalizedType };
    }

    if (userScope) {
      return { type: userScope };
    }

    if (hasRequestedType) {
      return { type: normalizedType };
    }

    return {};
  }

  assertMutatePermission(user, type) {
    if (!canMutateCommunicationType(user, type)) {
      throw new Error(
        "Forbidden: cannot modify this communication type",
      );
    }
  }

  async init() {
    await this.ensureCommunicationNumbers();
  }

  async listCommunications(user, { type } = {}) {
    const query = this.validateListScope(user, type);

    const rows = await Communication.find(query, null, {
      sort: { date: 1, createdAt: 1 },
    }).lean();

    return rows.map((row) =>
      this.normalizeStoredCommunication(row),
    );
  }

  async createCommunication(payload, user) {
    if (!canAccessCommunications(user)) {
      throw new Error("Forbidden");
    }

    const input = validateCommunicationInput(payload);
    this.assertMutatePermission(user, input.type);

    const autoNumber =
      await this.getNextCommunicationNumber();
    const timestamp = new Date().toISOString();

    const row = this.normalizeStoredCommunication({
      id: randomUUID(),
      number: autoNumber,
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await Communication.create(
      this.toPersistenceCommunication(row),
    );

    return row;
  }

  async updateCommunication(
    communicationId,
    payload,
    user,
  ) {
    if (!canAccessCommunications(user)) {
      throw new Error("Forbidden");
    }

    const input = validateCommunicationInput(payload, {
      partial: true,
    });

    const existingRow = await Communication.findOne({
      id: communicationId,
    }).lean();
    if (!existingRow) {
      throw new Error("Communication not found");
    }

    const row =
      this.normalizeStoredCommunication(existingRow);

    // A non-admin cannot touch records outside their own type.
    this.assertMutatePermission(user, row.type);

    if (
      Object.prototype.hasOwnProperty.call(input, "type")
    ) {
      this.assertMutatePermission(user, input.type);
    }

    this.applyCommunicationInput(row, input);
    this.assertMutatePermission(user, row.type);
    row.updatedAt = new Date().toISOString();

    await Communication.updateOne(
      { id: communicationId },
      this.toPersistenceCommunication(row),
    );

    return row;
  }

  async deleteCommunication(communicationId, user) {
    if (!canAccessCommunications(user)) {
      throw new Error("Forbidden");
    }

    const existingRow = await Communication.findOne(
      { id: communicationId },
      { type: 1 },
    ).lean();
    if (!existingRow) {
      throw new Error("Communication not found");
    }

    const type = sanitizeText(
      existingRow.type,
    ).toLowerCase();
    this.assertMutatePermission(user, type);

    await Communication.deleteOne({ id: communicationId });

    return { ok: true };
  }
}

const communicationService = new CommunicationService();

module.exports = { communicationService };
