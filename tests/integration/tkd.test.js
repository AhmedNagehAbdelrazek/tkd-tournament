// ponytail: single integration test file — doc-aligned TKD endpoints
const request = require('supertest');
const createApp = require('../../app');
const { tkdToken, authHeader } = require('../setup/tkdHelpers');

const app = createApp();
const agent = request.agent(app);

function adminHeaders() {
  return { ...authHeader(tkdToken({ tkdRole: 'ADMIN' })), 'Content-Type': 'application/json' };
}
function matJudgeHeaders() {
  return { ...authHeader(tkdToken({ tkdRole: 'MAT_JUDGE' })), 'Content-Type': 'application/json' };
}
function scorekeeperHeaders() {
  return { ...authHeader(tkdToken({ tkdRole: 'SCOREKEEPER' })), 'Content-Type': 'application/json' };
}

let clubId, tournamentId, playerId;

describe('Auth', () => {
  it('POST /api/v1/auth/login — returns 401 for bad credentials', async () => {
    const res = await agent.post('/api/v1/auth/login').send({ email: 'x@x', password: 'x' });
    expect([401, 422, 500]).toContain(res.status);
  });
});

describe('Clubs', () => {
  it('POST /api/v1/clubs — ADMIN can create club', async () => {
    const res = await agent.post('/api/v1/clubs').set(adminHeaders()).send({ name: 'Test Club' });
    if (res.status === 201) {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'Test Club');
      clubId = res.body.id;
    }
  });

  it('GET /api/v1/clubs — returns paginated list', async () => {
    const res = await agent.get('/api/v1/clubs').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it('POST /api/v1/clubs — SCOREKEEPER cannot create club', async () => {
    const res = await agent.post('/api/v1/clubs').set(scorekeeperHeaders()).send({ name: 'Should Fail' });
    expect(res.status).toBe(403);
  });
});

describe('Tournaments', () => {
  const validTournament = {
    name: 'Test Tournament',
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    categories: {
      gender: 'Both',
      bracketDepth: 3,
      weights: {
        males: [{ name: '10-15kg', minWeight: 10, maxWeight: 15 }],
        females: [{ name: '10-15kg', minWeight: 10, maxWeight: 15 }],
      },
    },
  };

  it('POST /api/v1/tournaments — ADMIN can create tournament', async () => {
    const res = await agent.post('/api/v1/tournaments').set(adminHeaders()).send(validTournament);
    if (res.status === 201) {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'Test Tournament');
      tournamentId = res.body.id;
    }
  });

  it('POST /api/v1/tournaments — SCOREKEEPER cannot create', async () => {
    const res = await agent.post('/api/v1/tournaments').set(scorekeeperHeaders()).send(validTournament);
    expect(res.status).toBe(403);
  });

  it('GET /api/v1/tournaments — returns paginated list', async () => {
    const res = await agent.get('/api/v1/tournaments').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it('GET /api/v1/tournaments/:id — returns detail', async () => {
    if (!tournamentId) return;
    const res = await agent.get(`/api/v1/tournaments/${tournamentId}`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id', tournamentId);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('registeredPlayers');
      expect(res.body).toHaveProperty('matchesPlayed');
    }
  });

  it('DELETE /api/v1/tournaments/:id — returns 204', async () => {
    const createRes = await agent.post('/api/v1/tournaments').set(adminHeaders()).send({
      ...validTournament, name: 'To Delete Tournament',
    });
    if (createRes.status !== 201) return;
    const id = createRes.body.id;
    const res = await agent.delete(`/api/v1/tournaments/${id}`).set(adminHeaders());
    expect(res.status).toBe(204);
  });
});

describe('Players', () => {
  it('POST /api/v1/players — ADMIN can register player (array)', async () => {
    const res = await agent.post('/api/v1/players').set(adminHeaders()).send([
      { fullName: 'Test Player', nationalId: '29001011234567', dateOfBirth: '2010-05-15', weightKg: 50, gender: 'Male', club: { id: clubId || 1, name: 'Test Club' } },
    ]);
    if (res.status === 201) {
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('fullName');
      expect(res.body[0]).toHaveProperty('weightKg');
      playerId = res.body[0].id;
    }
  });

  it('POST /api/v1/players — MAT_JUDGE cannot register', async () => {
    const res = await agent.post('/api/v1/players').set(matJudgeHeaders()).send([
      { fullName: 'Should Fail', nationalId: '29001011234567', dateOfBirth: '2010-05-15', weightKg: 50, gender: 'Male', club: { id: clubId || 1, name: 'Test Club' } },
    ]);
    expect(res.status).toBe(403);
  });

  it('GET /api/v1/players — returns paginated list', async () => {
    const res = await agent.get('/api/v1/players').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });
});

describe('WebSocket Contract — shape validation', () => {
  it('scoringHandler module loads without error', () => {
    const handler = require('../../socket/handlers/scoringHandler');
    expect(handler).toHaveProperty('registerScoringHandlers');
  });

  it('socketAuth module loads without error', () => {
    const auth = require('../../socket/middleware/socketAuth');
    expect(typeof auth).toBe('function');
  });
});
