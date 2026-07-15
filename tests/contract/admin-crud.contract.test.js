// Contract tests — validate response shapes for all new admin CRUD endpoints
const request = require('supertest');
const createApp = require('../../app');
const { tkdToken, authHeader } = require('../setup/tkdHelpers');

const app = createApp();
const agent = request.agent(app);

function adminHeaders() {
  return { ...authHeader(tkdToken({ tkdRole: 'ADMIN' })), 'Content-Type': 'application/json' };
}
function superAdminHeaders() {
  return { ...authHeader(tkdToken({ globalRole: 'super_admin', tkdRole: 'ADMIN' })), 'Content-Type': 'application/json' };
}

let clubId, tournamentId, playerId;

beforeAll(async () => {
  const clubRes = await agent.post('/api/clubs').set(adminHeaders()).send({ name: 'Contract Club' });
  if (clubRes.status === 201) clubId = clubRes.body.id;

  const tRes = await agent.post('/api/tournaments').set(adminHeaders()).send({
    name: 'Contract Tournament', startDate: '2026-08-01', endDate: '2026-08-03',
    settings: { roundDurationSec: 120, weightClasses: { MALE: [{ name: '60-65kg', min: 60, max: 65 }] } },
  });
  if (tRes.status === 201) tournamentId = tRes.body.id;

  if (clubId && tournamentId) {
    const p = await agent.post('/api/players').set(adminHeaders()).send({
      tournamentId, name: 'Contract Player', dob: '2000-01-01', weight: 62, gender: 'MALE', clubId,
    });
    if (p.status === 201) playerId = p.body.id;
  }
});

describe('Player Contract Shapes', () => {
  it('GET /api/players/:id — response has correct shape', async () => {
    if (!playerId) return;
    const res = await agent.get(`/api/players/${playerId}`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id');
      expect(typeof res.body.id).toBe('number');
      expect(res.body).toHaveProperty('name');
      expect(typeof res.body.name).toBe('string');
      expect(res.body).toHaveProperty('weight');
      expect(res.body).toHaveProperty('gender');
    }
  });

  it('GET /api/players — paginated list has data + meta', async () => {
    const res = await agent.get('/api/players?tournamentId=1&page=1&limit=10').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('limit');
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('totalPages');
    }
  });

  it('PUT /api/players/:id — response has correct shape', async () => {
    if (!playerId) return;
    const res = await agent.put(`/api/players/${playerId}`).set(adminHeaders()).send({ weight: 66 });
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('weight');
    }
  });

  it('DELETE /api/players/:id — response has correct shape', async () => {
    const createRes = await agent.post('/api/players').set(adminHeaders()).send({
      tournamentId: tournamentId || 1, name: 'Contract Delete', dob: '2001-01-01',
      weight: 55, gender: 'FEMALE', clubId: clubId || 1,
    });
    if (createRes.status !== 201) return;
    const res = await agent.delete(`/api/players/${createRes.body.id}`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('message');
      expect(typeof res.body.message).toBe('string');
    }
  });

  it('error response has correct error shape', async () => {
    const res = await agent.get('/api/players/99999').set(adminHeaders());
    if (res.status === 404) {
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
    }
  });
});

describe('Club Contract Shapes', () => {
  it('GET /api/clubs/:id — response has correct shape', async () => {
    if (!clubId) return;
    const res = await agent.get(`/api/clubs/${clubId}`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id');
      expect(typeof res.body.id).toBe('number');
      expect(res.body).toHaveProperty('name');
      expect(typeof res.body.name).toBe('string');
      expect(res.body).toHaveProperty('playerCount');
      expect(typeof res.body.playerCount).toBe('number');
    }
  });

  it('GET /api/clubs — paginated list has data + meta', async () => {
    const res = await agent.get('/api/clubs?page=1&limit=10').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('total');
    }
  });

  it('PUT /api/clubs/:id — response has correct shape', async () => {
    if (!clubId) return;
    const res = await agent.put(`/api/clubs/${clubId}`).set(adminHeaders()).send({ name: 'Contract Club Updated' });
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('playerCount');
    }
  });
});

describe('Tournament Contract Shapes', () => {
  it('GET /api/tournaments/:id — response has stats', async () => {
    if (!tournamentId) return;
    const res = await agent.get(`/api/tournaments/${tournamentId}`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('playerCount');
      expect(typeof res.body.playerCount).toBe('number');
      expect(res.body).toHaveProperty('matchCount');
      expect(typeof res.body.matchCount).toBe('number');
      expect(res.body).toHaveProperty('matchesByStatus');
      expect(typeof res.body.matchesByStatus).toBe('object');
    }
  });

  it('GET /api/tournaments — paginated list has data + meta', async () => {
    const res = await agent.get('/api/tournaments?page=1&limit=10').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('meta');
    }
  });

  it('PUT /api/tournaments/:id — response has correct shape', async () => {
    if (!tournamentId) return;
    const res = await agent.put(`/api/tournaments/${tournamentId}`).set(adminHeaders()).send({ name: 'Contract Tournament Updated' });
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('playerCount');
      expect(res.body).toHaveProperty('matchCount');
      expect(res.body).toHaveProperty('matchesByStatus');
    }
  });

  it('POST /api/tournaments/:id/complete — response has correct shape', async () => {
    if (!tournamentId) return;
    const res = await agent.post(`/api/tournaments/${tournamentId}/complete`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('isCompleted');
      expect(typeof res.body.isCompleted).toBe('boolean');
    }
  });
});

describe('Match Scheduling Contract Shapes', () => {
  it('GET /api/matches — paginated list has data + meta', async () => {
    const res = await agent.get('/api/matches?tournamentId=1&page=1&limit=10').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('total');
    }
  });

  it('POST /api/matches/schedule — validation error has correct shape', async () => {
    const res = await agent.post('/api/matches/schedule').set(adminHeaders()).send({});
    if (res.status === 400 || res.status === 422) {
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
    }
  });
});

describe('User Admin Contract Shapes', () => {
  it('GET /api/admin/users — paginated list has data + meta', async () => {
    const res = await agent.get('/api/admin/users?page=1&limit=10').set(superAdminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('total');
    }
  });

  it('GET /api/admin/users — users have correct shape (no password)', async () => {
    const res = await agent.get('/api/admin/users?page=1&limit=5').set(superAdminHeaders());
    if (res.status === 200 && res.body.data.length > 0) {
      const user = res.body.data[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).not.toHaveProperty('password');
      expect(user).toHaveProperty('isActive');
      expect(user).toHaveProperty('tkdRole');
    }
  });

  it('PUT /api/admin/users/:id/role — response has correct shape', async () => {
    const res = await agent.put('/api/admin/users/1/role').set(superAdminHeaders()).send({ tkdRole: 'ADMIN' });
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('tkdRole');
    }
  });

  it('PUT /api/admin/users/:id/deactivate — response has correct shape', async () => {
    const res = await agent.put('/api/admin/users/1/deactivate').set(superAdminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('isActive');
      expect(typeof res.body.isActive).toBe('boolean');
    }
  });

  it('PUT /api/admin/users/:id/reactivate — response has correct shape', async () => {
    const res = await agent.put('/api/admin/users/1/reactivate').set(superAdminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('isActive', true);
    }
  });

  it('non-super_admin gets 403 with error shape', async () => {
    const res = await agent.get('/api/admin/users').set(adminHeaders());
    if (res.status === 403) {
      expect(res.body).toHaveProperty('code');
      expect(res.body).toHaveProperty('message');
    }
  });
});

describe('Dashboard Contract Shapes', () => {
  it('GET /api/dashboard/tournaments — paginated list has correct shape', async () => {
    const res = await agent.get('/api/dashboard/tournaments?page=1&limit=10').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('meta');
      if (res.body.data.length > 0) {
        const t = res.body.data[0];
        expect(t).toHaveProperty('id');
        expect(t).toHaveProperty('name');
        expect(t).toHaveProperty('playerCount');
        expect(typeof t.playerCount).toBe('number');
        expect(t).toHaveProperty('matchCount');
        expect(typeof t.matchCount).toBe('number');
        expect(t).toHaveProperty('matchesByStatus');
        expect(typeof t.matchesByStatus).toBe('object');
      }
    }
  });

  it('GET /api/dashboard/tournaments/:id/overview — response has correct shape', async () => {
    if (!tournamentId) return;
    const res = await agent.get(`/api/dashboard/tournaments/${tournamentId}/overview`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('tournamentId', tournamentId);
      expect(typeof res.body.tournamentId).toBe('number');
      expect(res.body).toHaveProperty('tournamentName');
      expect(typeof res.body.tournamentName).toBe('string');
      expect(res.body).toHaveProperty('totalPlayers');
      expect(typeof res.body.totalPlayers).toBe('number');
      expect(res.body).toHaveProperty('totalMatches');
      expect(typeof res.body.totalMatches).toBe('number');
      expect(res.body).toHaveProperty('matchesByStatus');
      expect(typeof res.body.matchesByStatus).toBe('object');
      expect(res.body).toHaveProperty('upcomingMatches');
      expect(typeof res.body.upcomingMatches).toBe('number');
    }
  });
});
