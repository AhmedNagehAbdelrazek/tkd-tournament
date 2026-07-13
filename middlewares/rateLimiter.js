const { ApiErrors } = require('../utils/ApiError');

const clients = new Map();

function cleanupStaleEntries() {
  const now = Date.now();
  for (const [key, data] of clients.entries()) {
    data.timestamps = data.timestamps.filter((t) => now - t < 1000);
    if (data.timestamps.length === 0) {
      clients.delete(key);
    }
  }
}

const cleanupInterval = setInterval(cleanupStaleEntries, 60000);
if (cleanupInterval.unref) cleanupInterval.unref();

function rateLimiter(limit = 2) {
  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const endpoint = req.baseUrl + req.path;
    const clientId = `${userId}:${endpoint}`;
    const now = Date.now();

    let clientData = clients.get(clientId);
    if (!clientData) {
      clientData = { timestamps: [] };
      clients.set(clientId, clientData);
    }

    clientData.timestamps = clientData.timestamps.filter((t) => now - t < 1000);

    if (clientData.timestamps.length >= limit) {
      res.set('Retry-After', '1');
      return next(ApiErrors.serverError('Too many requests'));
    }

    clientData.timestamps.push(now);
    next();
  };
}

module.exports = rateLimiter;
