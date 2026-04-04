const express = require("express");
const {
  createCommunication,
  deleteCommunication,
  listCommunications,
  updateCommunication,
} = require("../controllers/communicationController");
const {
  requireCommunicationsAccess,
} = require("../middleware/permissions");

const router = express.Router();

router.get(
  "/",
  requireCommunicationsAccess,
  listCommunications,
);
router.post(
  "/",
  requireCommunicationsAccess,
  createCommunication,
);
router.patch(
  "/:communicationId",
  requireCommunicationsAccess,
  updateCommunication,
);
router.delete(
  "/:communicationId",
  requireCommunicationsAccess,
  deleteCommunication,
);

module.exports = router;
