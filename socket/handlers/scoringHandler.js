const scoringService = require('../../Services/scoringService');
const matchService = require('../../Services/matchService');
// ponytail: one role constant — TKD roles merged into ROLES
const { ROLES } = require('../../config/constants');

function registerScoringHandlers(io, socket) {
  socket.on('join_match', async ({ matchId }, callback) => {
    if (!matchId) {
      if (callback) callback({ success: false, error: { code: 'VALIDATION_ERROR', message: 'matchId required' } });
      return;
    }
    const room = `match_${matchId}`;
    socket.join(room);

    try {
      const state = await matchService.getMatchState(matchId);
      io.to(room).emit('MATCH:STATE_UPDATE', state);
      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
    }
  });

  socket.on('leave_match', async ({ matchId }, callback) => {
    if (matchId) {
      socket.leave(`match_${matchId}`);
    }
    if (callback) callback({ success: true });
  });

  socket.on('MATCH:ADD_POINT', async (data, callback) => {
    if (!socket.tkdRole || socket.tkdRole !== ROLES.MAT_JUDGE) {
      if (callback) callback({ success: false, error: { code: 'FORBIDDEN', message: 'Only MAT_JUDGE can score' } });
      return;
    }
    try {
      const result = await scoringService.addPoint(data.matchId, data.playerId, data.points, data.roundNumber);
      if (result.autoEnded) {
        io.to(`match_${data.matchId}`).emit('MATCH:FINISHED_BY_POINT_GAP', {
          matchId: data.matchId,
          winnerId: result.winnerId,
          finalScore: result.score,
        });
      }
      io.to(`match_${data.matchId}`).emit('MATCH:SCORE_UPDATE', {
        matchId: data.matchId,
        player1Score: result.score.player1,
        player2Score: result.score.player2,
        roundNumber: data.roundNumber,
        timestamp: new Date(),
      });
      if (callback) callback(result);
    } catch (err) {
      if (callback) callback({ success: false, error: { code: 'INVALID_ACTION', message: err.message } });
    }
  });

  socket.on('MATCH:REMOVE_POINT', async (data, callback) => {
    if (!socket.tkdRole || socket.tkdRole !== ROLES.MAT_JUDGE) {
      if (callback) callback({ success: false, error: { code: 'FORBIDDEN', message: 'Only MAT_JUDGE can score' } });
      return;
    }
    try {
      const result = await scoringService.removePoint(data.matchId, data.playerId, data.points, data.roundNumber);
      io.to(`match_${data.matchId}`).emit('MATCH:SCORE_UPDATE', {
        matchId: data.matchId,
        player1Score: result.score.player1,
        player2Score: result.score.player2,
        roundNumber: data.roundNumber,
        timestamp: new Date(),
      });
      if (callback) callback(result);
    } catch (err) {
      if (callback) callback({ success: false, error: { code: 'INVALID_ACTION', message: err.message } });
    }
  });

  socket.on('MATCH:END_ROUND', async (data, callback) => {
    if (!socket.tkdRole || socket.tkdRole !== ROLES.MAT_JUDGE) {
      if (callback) callback({ success: false, error: { code: 'FORBIDDEN', message: 'Only MAT_JUDGE can end rounds' } });
      return;
    }
    try {
      const result = await scoringService.endRound(data.matchId);
      io.to(`match_${data.matchId}`).emit('MATCH:ROUND_END', {
        matchId: data.matchId,
        roundNumber: result.currentRound - 1,
        nextRound: result.currentRound,
      });
      if (callback) callback(result);
    } catch (err) {
      if (callback) callback({ success: false, error: { code: 'INVALID_ACTION', message: err.message } });
    }
  });

  socket.on('MATCH:END', async (data, callback) => {
    if (!socket.tkdRole || socket.tkdRole !== ROLES.MAT_JUDGE) {
      if (callback) callback({ success: false, error: { code: 'FORBIDDEN', message: 'Only MAT_JUDGE can end matches' } });
      return;
    }
    try {
      const result = await matchService.endMatch(data.matchId, data.winnerId, data.endReason);
      io.to(`match_${data.matchId}`).emit('MATCH:STATE_UPDATE', {
        id: result.id,
        status: result.status,
        winnerId: result.winnerId,
        endTime: result.endTime,
        finalScore: result.finalScore,
      });
      if (result.progression) {
        io.emit('BRACKET:UPDATED', {
          tournamentId: result.tournamentId,
          weightClass: result.weightClass,
          gender: result.gender,
        });
      }
      if (callback) callback({ success: true, matchId: result.id, winnerId: result.winnerId });
    } catch (err) {
      if (callback) callback({ success: false, error: { code: 'INVALID_ACTION', message: err.message } });
    }
  });

  socket.on('MATCH:REQUEST_STATE', async ({ matchId }, callback) => {
    try {
      const state = await matchService.getMatchState(matchId);
      const room = `match_${matchId}`;
      io.to(room).emit('MATCH:STATE_UPDATE', state);
      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
    }
  });
}

module.exports = { registerScoringHandlers };
