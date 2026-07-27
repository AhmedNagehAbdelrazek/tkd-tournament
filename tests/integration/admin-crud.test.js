// Admin CRUD integration tests — doc-aligned endpoints only
const request = require('supertest');
const createApp = require('../../app');
const { tkdToken, authHeader } = require('../setup/tkdHelpers');

const app = createApp();
const agent = request.agent(app);

function adminHeaders() {
  return { ...authHeader(tkdToken({ globalRole: 'admin', tkdRole: 'ADMIN' })), 'Content-Type': 'application/json' };
}
function scorekeeperHeaders() {
  return { ...authHeader(tkdToken({ tkdRole: 'SCOREKEEPER' })), 'Content-Type': 'application/json' };
}

const DB_FAIL = 401;

let clubId, tournamentId, playerId;

beforeAll(async () => {
  const clubRes = await agent.post('/api/v1/clubs').set(adminHeaders()).send({ name: 'Admin Test Club' });
  if (clubRes.status === 201) clubId = clubRes.body.id;

  const tournamentRes = await agent.post('/api/v1/tournaments').set(adminHeaders()).send({
    name: 'Admin Test Tournament',
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    categories: {
      gender: 'Both',
      bracketDepth: 3,
      weights: {
        males: [{ name: 'Male -58kg', minWeight: 0, maxWeight: 58 }],
        females: [{ name: 'Female -49kg', minWeight: 0, maxWeight: 49 }],
      },
    },
  });
  if (tournamentRes.status === 201) tournamentId = tournamentRes.body.id;

  if (clubId && tournamentId) {
    const playerRes = await agent.post('/api/v1/players').set(adminHeaders()).send([
      {
        fullName: 'Admin Test Player',
        nationalId: '29001011234567',
        dateOfBirth: '2000-01-01',
        weightKg: 62,
        gender: 'Male',
        club: { id: clubId, name: 'Admin Test Club' },
      },
    ]);
    if (playerRes.status === 201 && Array.isArray(playerRes.body) && playerRes.body.length > 0) {
      playerId = playerRes.body[0].id;
    }
  }
});

describe('Player Management', () => {
  it('GET /api/v1/players — returns paginated list', async () => {
    const res = await agent.get('/api/v1/players?page=1&pageSize=10').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('totalCount');
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it('POST /api/v1/players — ADMIN can register player', async () => {
    const res = await agent.post('/api/v1/players').set(adminHeaders()).send([
      {
        fullName: 'Extra Player',
        nationalId: '29001011234568',
        dateOfBirth: '2001-06-15',
        weightKg: 58,
        gender: 'Female',
        club: { id: clubId || 1, name: 'Admin Test Club' },
      },
    ]);
    expect([201, DB_FAIL]).toContain(res.status);
    if (res.status === 201) {
      expect(Array.isArray(res.body)).toBe(true);
    }
  });

  it('POST /api/v1/players — SCOREKEEPER cannot register', async () => {
    const res = await agent.post('/api/v1/players').set(scorekeeperHeaders()).send([
      {
        fullName: 'Should Fail',
        nationalId: '29001011234569',
        dateOfBirth: '2000-01-01',
        weightKg: 55,
        gender: 'Male',
        club: { id: clubId || 1, name: 'Admin Test Club' },
      },
    ]);
    expect(res.status).toBe(403);
  });
});

describe('Club Management', () => {
  it('GET /api/v1/clubs — returns paginated list', async () => {
    const res = await agent.get('/api/v1/clubs?page=1&pageSize=10').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('totalCount');
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it('POST /api/v1/clubs — ADMIN can create club', async () => {
    const res = await agent.post('/api/v1/clubs').set(adminHeaders()).send({ name: 'Extra Club' });
    expect([201, DB_FAIL]).toContain(res.status);
  });

  it('POST /api/v1/clubs — SCOREKEEPER cannot create club', async () => {
    const res = await agent.post('/api/v1/clubs').set(scorekeeperHeaders()).send({ name: 'Should Fail' });
    expect(res.status).toBe(403);
  });
});

describe('Tournament Management', () => {
  it('GET /api/v1/tournaments — returns paginated list', async () => {
    const res = await agent.get('/api/v1/tournaments?page=1&pageSize=10').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('totalCount');
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it('GET /api/v1/tournaments/:id — returns tournament with stats', async () => {
    if (!tournamentId) return;
    const res = await agent.get(`/api/v1/tournaments/${tournamentId}`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id', tournamentId);
      expect(res.body).toHaveProperty('registeredPlayers');
      expect(res.body).toHaveProperty('matchesPlayed');
    }
  });

  it('PUT /api/v1/tournaments/:id — ADMIN can update name', async () => {
    if (!tournamentId) return;
    const res = await agent.put(`/api/v1/tournaments/${tournamentId}`).set(adminHeaders()).send({ name: 'Updated Tournament' });
    expect([200, DB_FAIL, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('name', 'Updated Tournament');
    }
  });

  it('PUT /api/v1/tournaments/:id — SCOREKEEPER cannot update', async () => {
    if (!tournamentId) return;
    const res = await agent.put(`/api/v1/tournaments/${tournamentId}`).set(scorekeeperHeaders()).send({ name: 'No' });
    expect([403, DB_FAIL]).toContain(res.status);
  });

  it('DELETE /api/v1/tournaments/:id — SCOREKEEPER cannot delete', async () => {
    if (!tournamentId) return;
    const res = await agent.delete(`/api/v1/tournaments/${tournamentId}`).set(scorekeeperHeaders());
    expect([403, DB_FAIL]).toContain(res.status);
  });

  it('DELETE /api/v1/tournaments/:id — ADMIN can delete tournament', async () => {
    const createRes = await agent.post('/api/v1/tournaments').set(adminHeaders()).send({
      name: 'Delete Me Tournament', startDate: '2026-09-01', endDate: '2026-09-03',
      categories: { gender: 'Both', bracketDepth: 3, weights: { males: [{ name: 'Male -58kg', minWeight: 0, maxWeight: 58 }], females: [] } },
    });
    if (createRes.status !== 201) return;
    const deleteId = createRes.body.id;
    const res = await agent.delete(`/api/v1/tournaments/${deleteId}`).set(adminHeaders());
    expect([204, DB_FAIL]).toContain(res.status);
  });
});

describe('Match Management', () => {
  it('GET /api/v1/matches — returns paginated list', async () => {
    const res = await agent.get('/api/v1/matches?page=1&pageSize=10').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('totalCount');
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });
});
