const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const RoleModel = require('../models/Role');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}

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
      const decoded = jwt.verify(token, JWT_SECRET);
      
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

      // Hardcoded super-admin fallback
      if (user.role === 'Admin' || user.role === 'Security Admin') {
        req.user = user;
        return next();
      }

      // 1. Fetch the user's base role capabilities from the database
      const role = await RoleModel.findOne({ name: user.role });
      
      // 2. Determine if the permission is explicitly configured at the user-level (override)
      const userOverride = user.permissions?.security?.[requiredPermission];
      
      // 3. Determine if the permission is granted by the role
      const roleGrants = role?.permissions?.security?.[requiredPermission] === true;

      // 4. Resolve final access: Use user override if it is explicitly boolean true/false. Otherwise, fallback to role.
      const hasAccess = typeof userOverride === 'boolean' ? userOverride : roleGrants;

      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          error: `Insufficient permissions. Required: security.${requiredPermission}`,
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
      const decoded = jwt.verify(token, JWT_SECRET);
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

module.exports = {
  checkSecurityPermission,
  checkSecurityRole,
};
