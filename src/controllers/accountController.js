const {
  accountService,
} = require("../services/accountService");

async function listAccounts(req, res, next) {
  try {
    const accounts = await accountService.listAccounts();
    return res.json({ accounts });
  } catch (error) {
    return next(error);
  }
}

async function createAccount(req, res, next) {
  try {
    const account = await accountService.createAccount(
      req.body,
      req.user,
    );
    return res.status(201).json({ account });
  } catch (error) {
    return next(error);
  }
}

async function updateRole(req, res, next) {
  try {
    const account = await accountService.updateRole(
      req.params.accountId,
      req.body.role,
      req.user,
    );
    return res.json({ account });
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const account = await accountService.resetPassword(
      req.params.accountId,
      req.body.password,
      req.user,
    );
    return res.json({ account });
  } catch (error) {
    return next(error);
  }
}

async function deleteAccount(req, res, next) {
  try {
    await accountService.deleteAccount(
      req.params.accountId,
      req.user,
    );
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listAccounts,
  createAccount,
  updateRole,
  resetPassword,
  deleteAccount,
};
