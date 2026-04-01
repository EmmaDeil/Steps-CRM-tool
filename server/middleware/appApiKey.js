const SystemSettings = require('../models/SystemSettings');

const extractAppApiKey = (req) => {
  const headerKey = req.headers['x-app-api-key'] || req.headers['x-api-key'];
  if (headerKey) return String(headerKey).trim();

  const authorization = String(req.headers.authorization || '').trim();
  if (authorization.toLowerCase().startsWith('apikey ')) {
    return authorization.slice(7).trim();
  }

  if (authorization.toLowerCase().startsWith('appkey ')) {
    return authorization.slice(7).trim();
  }

  return '';
};

const appApiKeyMiddleware = async (req, res, next) => {
  try {
    const providedKey = extractAppApiKey(req);
    if (!providedKey) {
      return res.status(401).json({
        success: false,
        message: 'Application API key required',
      });
    }

    const settings = await SystemSettings.findOne()
      .select('appApiKey appApiKeyGeneratedAt appApiKeyLastUsedAt')
      .lean();

    const storedKey = String(settings?.appApiKey || '').trim();
    if (!storedKey || storedKey !== providedKey) {
      return res.status(401).json({
        success: false,
        message: 'Invalid application API key',
      });
    }

    req.appApiKeyContext = {
      settingsId: settings?._id || null,
      generatedAt: settings?.appApiKeyGeneratedAt || null,
      lastUsedAt: settings?.appApiKeyLastUsedAt || null,
    };

    next();
  } catch (error) {
    console.error('Application API key authentication failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to authenticate application API key',
    });
  }
};

const touchAppApiKeyUsage = async (settingsId) => {
  try {
    if (!settingsId) {
      return;
    }

    await SystemSettings.updateOne(
      { _id: settingsId },
      { $set: { appApiKeyLastUsedAt: new Date() } },
    );
  } catch (error) {
    console.error('Failed to update application API key usage timestamp:', error);
  }
};

module.exports = {
  appApiKeyMiddleware,
  extractAppApiKey,
  touchAppApiKeyUsage,
};