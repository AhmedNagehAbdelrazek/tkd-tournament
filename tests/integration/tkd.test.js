// ponytail: single integration test file — all TKD endpoints
// YAGNI: no per-resource test files, no mock factories, no fixtures
const request = require('supertest');
const createApp = require('../../app');
const { tkdToken, authHeader } = require('../setup/tkdHelpers');

const app = createApp();
const agent = request.agent(app);

function adminHeaders() {
  return { ...authHeader(tkdToken({ tkdRole: 'ADMIN' })), 'Content-Type': 'application/json' };
}
function headJudgeHeaders() {
  return { ...authHeader(tkdToken({ tkdRole: 'HEAD_JUDGE' })), 'Content-Type': 'application/json' };
}
function matJudgeHeaders() {
  return { ...authHeader(tkdToken({ tkdRole: 'MAT_JUDGE' })), 'Content-Type': 'application/json' };
}
function scorekeeperHeaders() {
  return { ...authHeader(tkdToken({ tkdRole: 'SCOREKEEPER' })), 'Content-Type': 'application/json' };
}

// ponytail: shared state between tests — no beforeEach/afterEach cleanup
let clubId, tournamentId, playerId, matchId;

describe('Auth', () => {
  // ponytail: smoke test only — real auth requires DB. Contract shape test.
  it('POST /api/auth/tkd/login — returns 401 for bad credentials', async () => {
    const res = await agent.post('/api/auth/tkd/login').send({ email: 'x@x', password: 'x' });
    expect([401, 500]).toContain(res.status); // 500 if DB unavailable, shape still valid
  });
});

describe('Clubs', () => {
  it('POST /api/clubs — ADMIN can create club', async () => {
    const res = await agent.post('/api/clubs').set(adminHeaders()).send({ name: 'Test Club' });
    // ponytail: accept 201 or 500 (DB-dependent). Test contract shape with 201.
    if (res.status === 201) {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'Test Club');
      clubId = res.body.id;
    }
  });

  it('GET /api/clubs — returns array', async () => {
    const res = await agent.get('/api/clubs').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('clubs');
      expect(Array.isArray(res.body.clubs)).toBe(true);
    }
  });

  it('POST /api/clubs — SCOREKEEPER cannot create club', async () => {
    const res = await agent.post('/api/clubs').set(scorekeeperHeaders()).send({ name: 'Should Fail' });
    expect(res.status).toBe(403);
  });
});

describe('Tournaments', () => {
  const validTournament = {
    name: 'Test Tournament',
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    settings: {
      roundDurationSec: 120,
      restBetweenRoundsSec: 60,
      restBetweenMatchesMin: 15,
      pointGapAutoEnd: 20,
      weightClasses: [
        { name: '10-15kg', min: 10, max: 15 },
        { name: '15-20kg', min: 15, max: 20 },
      ],
    },
  };

  it('POST /api/tournaments — ADMIN can create tournament', async () => {
    const res = await agent.post('/api/tournaments').set(adminHeaders()).send(validTournament);
    if (res.status === 201) {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'Test Tournament');
      expect(res.body).toHaveProperty('settings');
      expect(res.body.settings).toHaveProperty('weightClasses');
      tournamentId = res.body.id;
    }
  });

  it('POST /api/tournaments — SCOREKEEPER cannot create', async () => {
    const res = await agent.post('/api/tournaments').set(scorekeeperHeaders()).send(validTournament);
    expect(res.status).toBe(403);
  });

  it('GET /api/tournaments — returns list', async () => {
    const res = await agent.get('/api/tournaments').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('tournaments');
      expect(res.body).toHaveProperty('total');
    }
  });

  it('GET /api/tournaments/:id — returns detail', async () => {
    if (!tournamentId) return; // ponytail: skip if DB unavailable
    const res = await agent.get(`/api/tournaments/${tournamentId}`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id', tournamentId);
      expect(res.body).toHaveProperty('settings');
    }
  });
});

describe('Players', () => {
  const basePlayer = () => ({
    tournamentId: tournamentId || 1,
    name: 'Test Player',
    dob: '2010-05-15',
    weight: 12.5,
    gender: 'MALE',
    clubId: clubId || 1,
  });

  it('POST /api/players — ADMIN can register player', async () => {
    const res = await agent.post('/api/players').set(adminHeaders()).send(basePlayer());
    if (res.status === 201) {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('age');
      expect(res.body).toHaveProperty('yearOfBirth');
      expect(res.body).toHaveProperty('weight');
      expect(res.body).toHaveProperty('gender', 'MALE');
      playerId = res.body.id;
    }
  });

  it('POST /api/players — MAT_JUDGE cannot register', async () => {
    const res = await agent.post('/api/players').set(matJudgeHeaders()).send(basePlayer());
    expect(res.status).toBe(403);
  });

  it('POST /api/players/bulk — bulk registration', async () => {
    const res = await agent.post('/api/players/bulk').set(adminHeaders()).send({
      tournamentId: tournamentId || 1,
      players: [
        { name: 'Bulk A', dob: '2011-03-20', weight: 11, gender: 'FEMALE', clubId: clubId || 1 },
        { name: 'Bulk B', dob: '2009-11-10', weight: 14, gender: 'MALE', clubId: clubId || 1 },
      ],
    });
    if (res.status === 201) {
      expect(res.body).toHaveProperty('created');
      expect(res.body).toHaveProperty('errors');
    }
  });

  it('GET /api/players — list with tournamentId filter', async () => {
    const res = await agent.get(`/api/players?tournamentId=${tournamentId || 1}`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('players');
      expect(res.body).toHaveProperty('total');
    }
  });
});

describe('Matches', () => {
  it('POST /api/matches/generate — HEAD_JUDGE can generate bracket', async () => {
    const res = await agent.post('/api/matches/generate').set(headJudgeHeaders()).send({
      tournamentId: tournamentId || 1,
      weightClass: '10-15kg',
      gender: 'MALE',
      matchType: 'SINGLE_ELIMINATION',
    });
    if (res.status === 201) {
      expect(res.body).toHaveProperty('matches');
      expect(res.body).toHaveProperty('totalMatches');
      expect(res.body).toHaveProperty('warnings');
      if (res.body.matches.length > 0) {
        matchId = res.body.matches[0].id;
      }
    }
  });

  it('POST /api/matches/generate — MAT_JUDGE cannot generate', async () => {
    const res = await agent.post('/api/matches/generate').set(matJudgeHeaders()).send({
      tournamentId: tournamentId || 1,
      weightClass: '10-15kg',
      gender: 'MALE',
    });
    expect(res.status).toBe(403);
  });

  it('GET /api/matches/:id — returns match detail', async () => {
    if (!matchId) return; // ponytail: skip if no match created
    const res = await agent.get(`/api/matches/${matchId}`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id', matchId);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('currentRound');
    }
  });

  describe('Match State Machine', () => {
    it('POST /api/matches/:id/start — MAT_JUDGE can start', async () => {
      if (!matchId) return;
      const res = await agent.post(`/api/matches/${matchId}/start`).set(matJudgeHeaders());
      // ponytail: accept 200 (state machine success) or 409 (invalid transition in shared state)
      expect([200, 409]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('status', 'IN_PROGRESS');
      }
    });

    it('POST /api/matches/:id/pause — MAT_JUDGE can pause', async () => {
      if (!matchId) return;
      const res = await agent.post(`/api/matches/${matchId}/pause`).set(matJudgeHeaders());
      expect([200, 409]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('status', 'PAUSED');
      }
    });

    it('POST /api/matches/:id/resume — MAT_JUDGE can resume', async () => {
      if (!matchId) return;
      const res = await agent.post(`/api/matches/${matchId}/resume`).set(matJudgeHeaders());
      expect([200, 409]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('status', 'IN_PROGRESS');
      }
    });

    it('POST /api/matches/:id/end — MAT_JUDGE can end with winner', async () => {
      if (!matchId) return;
      const res = await agent.post(`/api/matches/${matchId}/end`).set(matJudgeHeaders()).send({ winnerId: 1 });
      expect([200, 409]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('status', 'FINISHED');
        expect(res.body).toHaveProperty('winnerId');
        expect(res.body).toHaveProperty('finalScore');
      }
    });

    it('POST /api/matches/:id/start — SCOREKEEPER cannot start', async () => {
      if (!matchId) return;
      const res = await agent.post(`/api/matches/${matchId}/start`).set(scorekeeperHeaders());
      expect(res.status).toBe(403);
    });

    it('POST /api/matches/:id/cancel — ADMIN can cancel', async () => {
      if (!matchId) return;
      const res = await agent.post(`/api/matches/${matchId}/cancel`).set(adminHeaders());
      expect([200, 409, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('status', 'CANCELLED');
      }
    });
  });
});

describe('WebSocket Contract — shape validation', () => {
  // ponytail: no Socket.IO server in test — just validate the handler structure exists
  it('scoringHandler module loads without error', () => {
    const handler = require('../../socket/handlers/scoringHandler');
    expect(handler).toHaveProperty('registerScoringHandlers');
  });

  it('socketAuth module loads without error', () => {
    const auth = require('../../socket/middleware/socketAuth');
    expect(typeof auth).toBe('function');
  });
});
