require('dotenv').config();

/**
 * API-Key middleware for external website access.
 * Pass the key in the request header:  X-API-Key: <key>
 *
 * Set EXTERNAL_API_KEY in your .env file.
 */
const apiKeyAuth = (req, res, next) => {
  const key = req.headers['x-api-key'];

  if (!key) {
    return res.status(401).json({
      success: false,
      message: 'Missing API key. Send it in the X-API-Key header.',
    });
  }

  if (key !== process.env.EXTERNAL_API_KEY) {
    return res.status(403).json({
      success: false,
      message: 'Invalid API key.',
    });
  }

  next();
};

module.exports = apiKeyAuth;

