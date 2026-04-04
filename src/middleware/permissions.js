function isAdminLike(user) {
  return user?.role === "root" || user?.role === "admin";
}

function canAccessTasksMeetings(user) {
  if (isAdminLike(user)) {
    return true;
  }

  return user?.type === "none";
}

function canAccessCommunications(user) {
  if (isAdminLike(user)) {
    return true;
  }

  return Boolean(user?.type) && user.type !== "none";
}

function resolveCommunicationTypeScope(user) {
  if (isAdminLike(user) || user?.type === "global") {
    return null;
  }

  if (!user?.type || user.type === "none") {
    return "none";
  }

  return user.type;
}

function canMutateCommunicationType(user, type) {
  if (isAdminLike(user)) {
    return true;
  }

  if (!user?.type || user.type === "none") {
    return false;
  }

  if (user.type === "global") {
    return true;
  }

  return user.type === type;
}

function requireTasksMeetingsAccess(req, res, next) {
  if (!req.user) {
    return res
      .status(401)
      .json({ error: "Authentication required" });
  }

  if (!canAccessTasksMeetings(req.user)) {
    return res.status(403).json({
      error:
        "Forbidden: tasks and meetings are only available for type none users, admins, and root",
    });
  }

  return next();
}

function requireCommunicationsAccess(req, res, next) {
  if (!req.user) {
    return res
      .status(401)
      .json({ error: "Authentication required" });
  }

  if (!canAccessCommunications(req.user)) {
    return res.status(403).json({
      error:
        "Forbidden: communications are unavailable for type none users",
    });
  }

  return next();
}

module.exports = {
  isAdminLike,
  canAccessTasksMeetings,
  canAccessCommunications,
  resolveCommunicationTypeScope,
  canMutateCommunicationType,
  requireTasksMeetingsAccess,
  requireCommunicationsAccess,
};
