const path = require("path");
const { randomUUID } = require("crypto");
const {
  BOOTSTRAP_ADMIN_PASSWORD,
  BOOTSTRAP_ADMIN_USERNAME,
  DATA_DIR,
  ROOT_ACCOUNT_PASSWORD,
  ROOT_ACCOUNT_USERNAME,
} = require("../config");
const {
  validatePassword,
  validateRole,
  validateUsername,
} = require("../middleware/validation");
const {
  hashPassword,
  verifyPassword,
} = require("../utils/password");
const { JsonStore } = require("../utils/jsonStore");

const accountStore = new JsonStore(
  path.join(DATA_DIR, "accounts.json"),
  { accounts: [] },
);

const ROOT_ROLE = "root";

function toPublicAccount(account) {
  return {
    id: account.id,
    username: account.username,
    role: account.role,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

class AccountService {
  async init() {
    await accountStore.init();
    await this.ensureRootAccount();
    await this.ensureBootstrapAdmin();
  }

  async ensureRootAccount() {
    await accountStore.update(async (state) => {
      const rootUsername = validateUsername(
        ROOT_ACCOUNT_USERNAME,
      );
      const rootPassword = validatePassword(
        ROOT_ACCOUNT_PASSWORD,
      );

      const rootAccounts = state.accounts.filter(
        (account) => account.role === ROOT_ROLE,
      );

      if (rootAccounts.length > 1) {
        const keeperId = rootAccounts[0].id;
        state.accounts = state.accounts.filter(
          (account) =>
            account.role !== ROOT_ROLE ||
            account.id === keeperId,
        );
      }

      let rootAccount = state.accounts.find(
        (account) => account.role === ROOT_ROLE,
      );

      if (!rootAccount) {
        const usernameTakenByOther = state.accounts.some(
          (account) =>
            account.username.toLowerCase() ===
            rootUsername.toLowerCase(),
        );

        if (usernameTakenByOther) {
          throw new Error(
            "Configured root username already exists with a non-root role",
          );
        }

        rootAccount = {
          id: randomUUID(),
          username: rootUsername,
          role: ROOT_ROLE,
          passwordHash: await hashPassword(rootPassword),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        state.accounts.unshift(rootAccount);
        return state;
      }

      let changed = false;
      const now = new Date().toISOString();

      if (
        rootAccount.username.toLowerCase() !==
        rootUsername.toLowerCase()
      ) {
        rootAccount.username = rootUsername;
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
        rootAccount.updatedAt = now;
      }

      return state;
    });
  }

  async ensureBootstrapAdmin() {
    await accountStore.update(async (state) => {
      const hasAdmin = state.accounts.some(
        (account) => account.role === "admin",
      );
      if (hasAdmin) return state;

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

      state.accounts.push({
        id: randomUUID(),
        username,
        role: "admin",
        passwordHash: await hashPassword(password),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return state;
    });
  }

  async authenticate(usernameInput, passwordInput) {
    const username = validateUsername(usernameInput);
    const password = validatePassword(passwordInput);

    const state = await accountStore.read();
    const account = state.accounts.find(
      (item) =>
        item.username.toLowerCase() ===
        username.toLowerCase(),
    );

    if (!account) return null;

    const isPasswordValid = await verifyPassword(
      password,
      account.passwordHash,
    );
    if (!isPasswordValid) return null;

    return toPublicAccount(account);
  }

  async listAccounts() {
    const state = await accountStore.read();
    return state.accounts.map(toPublicAccount);
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
      ROOT_ACCOUNT_USERNAME.toLowerCase()
    ) {
      throw new Error("Root account already exists");
    }

    if (actor.role === "admin" && role !== "user") {
      throw new Error(
        "Admins can only create user accounts",
      );
    }

    let createdAccount = null;
    await accountStore.update(async (state) => {
      const exists = state.accounts.some(
        (item) =>
          item.username.toLowerCase() ===
          username.toLowerCase(),
      );
      if (exists) {
        throw new Error("Username already exists");
      }

      const account = {
        id: randomUUID(),
        username,
        role,
        passwordHash: await hashPassword(password),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      state.accounts.push(account);
      createdAccount = toPublicAccount(account);
      return state;
    });

    return createdAccount;
  }

  async deleteAccount(accountId, actor) {
    if (
      !actor ||
      !["admin", ROOT_ROLE].includes(actor.role)
    ) {
      throw new Error("Forbidden");
    }

    await accountStore.update(async (state) => {
      const targetIndex = state.accounts.findIndex(
        (item) => item.id === accountId,
      );
      if (targetIndex < 0) {
        throw new Error("Account not found");
      }

      const target = state.accounts[targetIndex];

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

      state.accounts.splice(targetIndex, 1);
      return state;
    });

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

    let updatedAccount = null;
    await accountStore.update(async (state) => {
      const target = state.accounts.find(
        (item) => item.id === accountId,
      );
      if (!target) {
        throw new Error("Account not found");
      }

      const requestedRole = String(roleInput || "")
        .trim()
        .toLowerCase();

      // Keep current role without forcing a write, including root.
      if (requestedRole === target.role) {
        updatedAccount = toPublicAccount(target);
        return state;
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
      target.updatedAt = new Date().toISOString();
      updatedAccount = toPublicAccount(target);
      return state;
    });

    return updatedAccount;
  }

  async resetPassword(accountId, newPasswordInput, actor) {
    if (
      !actor ||
      !["admin", ROOT_ROLE].includes(actor.role)
    ) {
      throw new Error("Forbidden");
    }

    const newPassword = validatePassword(newPasswordInput);

    let updatedAccount = null;
    await accountStore.update(async (state) => {
      const target = state.accounts.find(
        (item) => item.id === accountId,
      );
      if (!target) {
        throw new Error("Account not found");
      }

      if (
        actor.role === "admin" &&
        target.id !== actor.id
      ) {
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
      target.updatedAt = new Date().toISOString();
      updatedAccount = toPublicAccount(target);
      return state;
    });

    return updatedAccount;
  }
}

const accountService = new AccountService();

module.exports = { accountService };
