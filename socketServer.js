const { Server } = require('socket.io');
const socketAuth = require('./socket/middleware/socketAuth');
const { registerScoringHandlers } = require('./socket/handlers/scoringHandler');
const { TKD_ROLES } = require('./config/constants');

function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  socketAuth(io);

  const liveMatches = io.of('/live-matches');

  liveMatches.on('connection', (socket) => {
    console.log('TKD client connected:', socket.id, 'role:', socket.tkdRole);

    socket.on('disconnect', () => {
      console.log('TKD client disconnected:', socket.id);
    });

    registerScoringHandlers(liveMatches, socket);
  });

  return io;
}

module.exports = { createSocketServer };
