const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function socketAuth(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.tkdRole = decoded.tkdRole || decoded.globalRole;
      socket.tkdUserId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });
}

module.exports = socketAuth;
