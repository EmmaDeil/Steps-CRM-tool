const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');

/**
 * Middleware to check if user has specific security permission
 */
const checkSecurityPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          success: false, 
          error: 'No authorization token provided' 
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user with permissions
      const user = await UserModel.findById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      if (user.status !== 'Active') {
        return res.status(403).json({ 
          success: false, 
          error: 'User account is not active' 
        });
      }

      // Admin and Security Admin have all permissions
      if (user.role === 'Admin' || user.role === 'Security Admin') {
        req.user = user;
        return next();
      }

      // Check specific permission
      if (!user.permissions || !user.permissions.security) {
        return res.status(403).json({ 
          success: false, 
          error: 'No security permissions configured for user' 
        });
      }

      // Check if user has the required permission
      if (!user.permissions.security[requiredPermission]) {
        return res.status(403).json({ 
          success: false, 
          error: `Insufficient permissions. Required: ${requiredPermission}`,
          requiredPermission
        });
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      console.error('Security permission check error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid token' 
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          error: 'Token expired' 
        });
      }

      return res.status(500).json({ 
        success: false, 
        error: 'Permission check failed' 
      });
    }
  };
};

/**
 * Middleware to check if user has any of the specified roles
 */
const checkSecurityRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          success: false, 
          error: 'No authorization token provided' 
        });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await UserModel.findById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      if (user.status !== 'Active') {
        return res.status(403).json({ 
          success: false, 
          error: 'User account is not active' 
        });
      }

      // Check if user has one of the allowed roles
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          success: false, 
          error: `Insufficient role. Required one of: ${allowedRoles.join(', ')}`,
          requiredRoles: allowedRoles,
          userRole: user.role
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Security role check error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid token' 
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          error: 'Token expired' 
        });
      }

      return res.status(500).json({ 
        success: false, 
        error: 'Role check failed' 
      });
    }
  };
};

/**
 * Get default security permissions based on role
 */
const getDefaultSecurityPermissions = (role) => {
  const permissions = {
    viewLogs: false,
    exportLogs: false,
    manageSettings: false,
    manageNotifications: false,
    viewAnalytics: false,
    manageSessions: false,
    generateReports: false,
  };

  switch (role) {
    case 'Admin':
    case 'Security Admin':
      // Full access to all security features
      return {
        viewLogs: true,
        exportLogs: true,
        manageSettings: true,
        manageNotifications: true,
        viewAnalytics: true,
        manageSessions: true,
        generateReports: true,
      };
    
    case 'Security Analyst':
      // Can view and analyze, but not modify settings
      return {
        viewLogs: true,
        exportLogs: true,
        manageSettings: false,
        manageNotifications: false,
        viewAnalytics: true,
        manageSessions: false,
        generateReports: true,
      };
    
    case 'Editor':
      // Limited security access
      return {
        viewLogs: true,
        exportLogs: false,
        manageSettings: false,
        manageNotifications: false,
        viewAnalytics: false,
        manageSessions: false,
        generateReports: false,
      };
    
    default:
      // Viewer and user roles have no security permissions by default
      return permissions;
  }
};

module.exports = {
  checkSecurityPermission,
  checkSecurityRole,
  getDefaultSecurityPermissions,
};
