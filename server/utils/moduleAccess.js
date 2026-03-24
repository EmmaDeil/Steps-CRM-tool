const DEFAULT_ACTIONS = {
  view: true,
  create: false,
  edit: false,
  delete: false,
  approve: false,
  export: false,
};

const normalizeActionMap = (actions = {}) => ({
  ...DEFAULT_ACTIONS,
  ...actions,
  view: true,
});

const normalizeModulePermissionEntry = (entry = {}) => {
  const accessLevel = String(entry?.accessLevel || "").trim().toLowerCase();
  const level = ["view", "edit", "manage"].includes(accessLevel)
    ? accessLevel
    : entry?.access
      ? "view"
      : "none";

  const baseByLevel =
    level === "manage"
      ? {
          view: true,
          create: true,
          edit: true,
          delete: true,
          approve: true,
          export: true,
        }
      : level === "edit"
        ? {
            view: true,
            create: true,
            edit: true,
            delete: false,
            approve: false,
            export: false,
          }
        : {
            view: true,
            create: false,
            edit: false,
            delete: false,
            approve: false,
            export: false,
          };

  const actions = normalizeActionMap({ ...baseByLevel, ...(entry?.actions || {}) });

  return {
    moduleId: entry?.moduleId,
    moduleName: String(entry?.moduleName || "").trim(),
    access: level !== "none",
    accessLevel: level,
    actions,
  };
};

const normalizeModuleKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const isAdminLike = (user) => {
  const role = normalizeModuleKey(user?.role);
  return role === "admin" || role === "securityadmin";
};

const getRoleFallbackAccessLevel = (role) => {
  const normalized = normalizeModuleKey(role);
  if (normalized === "admin" || normalized === "securityadmin") return "manage";
  if (normalized === "editor") return "edit";
  return "view";
};

const getEffectiveModulePermission = (user, moduleNameOrId) => {
  if (isAdminLike(user)) {
    return normalizeModulePermissionEntry({
      moduleName: String(moduleNameOrId || ""),
      access: true,
      accessLevel: "manage",
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        approve: true,
        export: true,
      },
    });
  }

  const key = normalizeModuleKey(moduleNameOrId);
  const entries = Array.isArray(user?.permissions?.modules)
    ? user.permissions.modules
    : [];

  const matched = entries.find((entry) => {
    const byId = normalizeModuleKey(entry?.moduleId);
    const byName = normalizeModuleKey(entry?.moduleName);
    return byId === key || byName === key;
  });

  if (matched) {
    return normalizeModulePermissionEntry(matched);
  }

  const fallbackLevel = getRoleFallbackAccessLevel(user?.role);
  return normalizeModulePermissionEntry({
    moduleName: String(moduleNameOrId || ""),
    access: true,
    accessLevel: fallbackLevel,
  });
};

const hasModuleAction = (user, moduleNameOrId, action = "view") => {
  const permission = getEffectiveModulePermission(user, moduleNameOrId);
  const normalizedAction = normalizeModuleKey(action);
  if (!permission.access) return false;
  if (normalizedAction === "view") return permission.actions.view === true;
  if (permission.accessLevel === "manage") return true;
  return permission.actions[normalizedAction] === true;
};

const filterAccessibleModules = (user, modules = []) => {
  if (isAdminLike(user)) return modules;
  return (modules || []).filter((module) =>
    hasModuleAction(user, module?.name || module?.id || module?._id, "view"),
  );
};

module.exports = {
  normalizeModulePermissionEntry,
  getEffectiveModulePermission,
  hasModuleAction,
  filterAccessibleModules,
};
