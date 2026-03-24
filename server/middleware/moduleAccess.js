const { hasModuleAction } = require('../utils/moduleAccess');

const requireModuleAction = (moduleName, action = 'view') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const allowed = hasModuleAction(req.user, moduleName, action);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: `Insufficient module permissions for ${moduleName}:${action}`,
      });
    }

    next();
  };
};

module.exports = {
  requireModuleAction,
};
