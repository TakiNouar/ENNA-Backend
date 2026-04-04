const {
  communicationService,
} = require("../services/communicationService");

async function listCommunications(req, res, next) {
  try {
    const communications =
      await communicationService.listCommunications(
        req.user,
        { type: req.query.type },
      );
    return res.json({ communications });
  } catch (error) {
    return next(error);
  }
}

async function createCommunication(req, res, next) {
  try {
    const communication =
      await communicationService.createCommunication(
        req.body,
        req.user,
      );
    return res.status(201).json({ communication });
  } catch (error) {
    return next(error);
  }
}

async function updateCommunication(req, res, next) {
  try {
    const communication =
      await communicationService.updateCommunication(
        req.params.communicationId,
        req.body,
        req.user,
      );
    return res.json({ communication });
  } catch (error) {
    return next(error);
  }
}

async function deleteCommunication(req, res, next) {
  try {
    await communicationService.deleteCommunication(
      req.params.communicationId,
      req.user,
    );
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listCommunications,
  createCommunication,
  updateCommunication,
  deleteCommunication,
};
