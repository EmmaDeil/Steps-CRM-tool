export const DEFAULT_MODULE_ACTIONS = {
  view: true,
  create: false,
  edit: false,
  delete: false,
  approve: false,
  export: false,
};

export const normalizeModuleKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const getRoleDefaultAccessLevel = (role) => {
  const normalized = normalizeModuleKey(role);
  if (normalized === "admin" || normalized === "securityadmin") return "manage";
  if (normalized === "editor") return "edit";
  return "view";
};

export const actionDefaultsForLevel = (accessLevel = "view") => {
  const level = String(accessLevel || "").toLowerCase();
  if (level === "manage") {
    return {
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true,
      export: true,
    };
  }
  if (level === "edit") {
    return {
      view: true,
      create: true,
      edit: true,
      delete: false,
      approve: false,
      export: false,
    };
  }
  return {
    view: true,
    create: false,
    edit: false,
    delete: false,
    approve: false,
    export: false,
  };
};

export const normalizeModulePermissionEntry = (entry = {}) => {
  const levelRaw = String(entry?.accessLevel || "").toLowerCase();
  const accessLevel = ["view", "edit", "manage"].includes(levelRaw)
    ? levelRaw
    : entry?.access
      ? "view"
      : "none";

  return {
    moduleId: entry?.moduleId,
    moduleName: String(entry?.moduleName || "").trim(),
    access: accessLevel !== "none",
    accessLevel,
    actions: {
      ...DEFAULT_MODULE_ACTIONS,
      ...actionDefaultsForLevel(accessLevel),
      ...(entry?.actions || {}),
      view: true,
    },
  };
};

export const getEffectiveModulePermission = ({ user, userRole, moduleName }) => {
  const roleKey = normalizeModuleKey(user?.role || userRole);
  if (roleKey === "admin" || roleKey === "securityadmin") {
    return normalizeModulePermissionEntry({
      moduleName,
      access: true,
      accessLevel: "manage",
    });
  }

  const entries = Array.isArray(user?.permissions?.modules)
    ? user.permissions.modules
    : [];
  const targetKey = normalizeModuleKey(moduleName);

  const matched = entries.find((entry) => {
    const byName = normalizeModuleKey(entry?.moduleName);
    const byId = normalizeModuleKey(entry?.moduleId);
    return byName === targetKey || byId === targetKey;
  });

  if (matched) {
    return normalizeModulePermissionEntry(matched);
  }

  return normalizeModulePermissionEntry({
    moduleName,
    access: true,
    accessLevel: getRoleDefaultAccessLevel(user?.role || userRole),
  });
};
