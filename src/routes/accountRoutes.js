const express = require("express");
const {
  createAccount,
  deleteAccount,
  listAccounts,
  resetPassword,
  updateRole,
} = require("../controllers/accountController");

const router = express.Router();

router.get("/", listAccounts);
router.post("/", createAccount);
router.patch("/:accountId/role", updateRole);
router.patch("/:accountId/password", resetPassword);
router.delete("/:accountId", deleteAccount);

module.exports = router;
