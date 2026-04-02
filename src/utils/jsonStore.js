const fs = require("fs/promises");
const path = require("path");
const { sha256 } = require("./hash");

const RETRYABLE_FS_ERRORS = new Set([
  "EPERM",
  "EBUSY",
  "EACCES",
]);

function isRetryableFsError(error) {
  return RETRYABLE_FS_ERRORS.has(error?.code);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function renameWithRetry(from, to) {
  const maxAttempts = 8;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt += 1
  ) {
    try {
      await fs.rename(from, to);
      return;
    } catch (error) {
      if (
        !isRetryableFsError(error) ||
        attempt === maxAttempts
      ) {
        throw error;
      }

      await sleep(40 * attempt);
    }
  }
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    const body = keys
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableStringify(value[key])}`,
      )
      .join(",");
    return `{${body}}`;
  }
  return JSON.stringify(value);
}

function createEnvelope(data) {
  const serializedData = stableStringify(data);
  return {
    meta: {
      version: 1,
      updatedAt: new Date().toISOString(),
      checksum: sha256(serializedData),
    },
    data,
  };
}

function isValidEnvelope(value) {
  if (!value || typeof value !== "object") return false;
  if (!value.meta || typeof value.meta !== "object")
    return false;
  if (!value.data || typeof value.data !== "object")
    return false;
  if (typeof value.meta.checksum !== "string") return false;
  const checksum = sha256(stableStringify(value.data));
  return checksum === value.meta.checksum;
}

class JsonStore {
  constructor(filePath, defaultData) {
    this.filePath = filePath;
    this.backupPath = `${filePath}.bak`;
    this.defaultData = defaultData;
    this.queue = Promise.resolve();
  }

  async init() {
    await fs.mkdir(path.dirname(this.filePath), {
      recursive: true,
    });
    try {
      const envelope = await this._readEnvelope(
        this.filePath,
      );
      if (!isValidEnvelope(envelope))
        throw new Error("Invalid checksum");
    } catch (error) {
      if (error.code === "ENOENT") {
        await this._writeEnvelope(
          createEnvelope(this.defaultData),
        );
        return;
      }
      try {
        const backup = await this._readEnvelope(
          this.backupPath,
        );
        if (!isValidEnvelope(backup))
          throw new Error("Backup checksum mismatch");
        await this._writeEnvelope(backup);
      } catch {
        await this._writeEnvelope(
          createEnvelope(this.defaultData),
        );
      }
    }
  }

  read() {
    return this._enqueue(async () => {
      const envelope = await this._readEnvelope(
        this.filePath,
      );
      if (!isValidEnvelope(envelope)) {
        throw new Error(
          `Data integrity check failed for ${this.filePath}`,
        );
      }
      return structuredClone(envelope.data);
    });
  }

  update(mutator) {
    return this._enqueue(async () => {
      const envelope = await this._readEnvelope(
        this.filePath,
      );
      if (!isValidEnvelope(envelope)) {
        throw new Error(
          `Data integrity check failed for ${this.filePath}`,
        );
      }
      const draft = structuredClone(envelope.data);
      const result = await mutator(draft);
      const nextData =
        result === undefined ? draft : result;
      const nextEnvelope = createEnvelope(nextData);
      await this._writeEnvelope(nextEnvelope);
      return structuredClone(nextData);
    });
  }

  _enqueue(operation) {
    this.queue = this.queue.then(operation, operation);
    return this.queue;
  }

  async _readEnvelope(targetPath) {
    const raw = await fs.readFile(targetPath, "utf8");
    return JSON.parse(raw);
  }

  async _writeEnvelope(envelope) {
    const tempPath = `${this.filePath}.tmp`;
    const payload = `${JSON.stringify(envelope, null, 2)}\n`;

    await fs.writeFile(tempPath, payload, "utf8");

    try {
      await renameWithRetry(tempPath, this.filePath);
    } catch (error) {
      if (!isRetryableFsError(error)) {
        throw error;
      }

      // Fallback for cloud-sync/antivirus lock contention.
      await fs.writeFile(this.filePath, payload, "utf8");
      try {
        await fs.unlink(tempPath);
      } catch {
        // Best effort cleanup.
      }
    }

    await fs.writeFile(this.backupPath, payload, "utf8");
  }
}

module.exports = { JsonStore };
