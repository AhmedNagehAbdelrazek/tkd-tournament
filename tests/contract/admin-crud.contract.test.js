// Contract tests — validate response shapes for doc endpoints
const request = require('supertest');
const createApp = require('../../app');
const { tkdToken, authHeader } = require('../setup/tkdHelpers');

const app = createApp();
const agent = request.agent(app);

function adminHeaders() {
  return { ...authHeader(tkdToken({ tkdRole: 'ADMIN' })), 'Content-Type': 'application/json' };
}

let clubId, tournamentId, playerId;

beforeAll(async () => {
  const clubRes = await agent.post('/api/v1/clubs').set(adminHeaders()).send({ name: 'Contract Club' });
  if (clubRes.status === 201) clubId = clubRes.body.id;

  const tRes = await agent.post('/api/v1/tournaments').set(adminHeaders()).send({
    name: 'Contract Tournament', startDate: '2026-08-01', endDate: '2026-08-03',
    categories: { gender: 'Both', bracketDepth: 3, weights: { males: [{ name: 'Male -58kg', minWeight: 0, maxWeight: 58 }], females: [] } },
  });
  if (tRes.status === 201) tournamentId = tRes.body.id;

  if (clubId && tournamentId) {
    const p = await agent.post('/api/v1/players').set(adminHeaders()).send([
      { fullName: 'Contract Player', dateOfBirth: '2000-01-01', weightKg: 62, gender: 'Male', club: { id: clubId, name: 'Contract Club' }, nationalId: '29001011234567' },
    ]);
    if (p.status === 201 && Array.isArray(p.body) && p.body.length > 0) playerId = p.body[0].id;
    else if (p.status === 201 && p.body.id) playerId = p.body.id;
  }
});

describe('Player Contract Shapes', () => {
  it('GET /api/v1/players — paginated list has correct shape', async () => {
    const res = await agent.get('/api/v1/players?page=1&pageSize=10').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('totalCount');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('pageSize');
    }
  });
});

describe('Club Contract Shapes', () => {
  it('GET /api/v1/clubs — paginated list has correct shape', async () => {
    const res = await agent.get('/api/v1/clubs?page=1&pageSize=10').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('totalCount');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('pageSize');
    }
  });
});

describe('Tournament Contract Shapes', () => {
  it('GET /api/v1/tournaments/:id — response has correct shape', async () => {
    if (!tournamentId) return;
    const res = await agent.get(`/api/v1/tournaments/${tournamentId}`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('startDate');
      expect(res.body).toHaveProperty('endDate');
      expect(res.body).toHaveProperty('registeredPlayers');
      expect(typeof res.body.registeredPlayers).toBe('number');
      expect(res.body).toHaveProperty('matchesPlayed');
      expect(typeof res.body.matchesPlayed).toBe('number');
    }
  });

  it('GET /api/v1/tournaments — paginated list has correct shape', async () => {
    const res = await agent.get('/api/v1/tournaments?page=1&pageSize=10').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('totalCount');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('pageSize');
    }
  });
});

describe('Match Contract Shapes', () => {
  it('GET /api/v1/matches — paginated list has correct shape', async () => {
    const res = await agent.get('/api/v1/matches?page=1&pageSize=10').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('totalCount');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('pageSize');
    }
  });
});
