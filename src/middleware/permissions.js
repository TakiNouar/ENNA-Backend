function isAdminLike(user) {
  return user?.role === "root" || user?.role === "admin";
}

function normalizeUserType(value) {
  const type = String(value || "")
    .trim()
    .toLowerCase();
  return type === "radar" ? "surveillance" : type;
}

function canAccessTasksMeetings(user) {
  if (isAdminLike(user)) {
    return true;
  }

  return normalizeUserType(user?.type) === "none";
}

function canAccessCommunications(user) {
  const userType = normalizeUserType(user?.type);

  if (isAdminLike(user)) {
    return true;
  }

  return Boolean(userType) && userType !== "none";
}

function resolveCommunicationTypeScope(user) {
  const userType = normalizeUserType(user?.type);

  if (isAdminLike(user) || userType === "global") {
    return null;
  }

  if (!userType || userType === "none") {
    return "none";
  }

  return userType;
}

function canMutateCommunicationType(user, type) {
  const userType = normalizeUserType(user?.type);

  if (isAdminLike(user)) {
    return true;
  }

  if (!userType || userType === "none") {
    return false;
  }

  if (userType === "global") {
    return true;
  }

  return userType === type;
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
