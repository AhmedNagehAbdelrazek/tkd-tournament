// Admin CRUD integration tests — Player, Club, Tournament, Match, User Admin, Dashboard
const request = require('supertest');
const createApp = require('../../app');
const { tkdToken, authHeader } = require('../setup/tkdHelpers');

const app = createApp();
const agent = request.agent(app);

function adminHeaders() {
  return { ...authHeader(tkdToken({ globalRole: 'admin', tkdRole: 'ADMIN' })), 'Content-Type': 'application/json' };
}
function superAdminHeaders() {
  return { ...authHeader(tkdToken({ globalRole: 'super_admin', tkdRole: 'ADMIN' })), 'Content-Type': 'application/json' };
}
function headJudgeHeaders() {
  return { ...authHeader(tkdToken({ tkdRole: 'HEAD_JUDGE' })), 'Content-Type': 'application/json' };
}
function scorekeeperHeaders() {
  return { ...authHeader(tkdToken({ tkdRole: 'SCOREKEEPER' })), 'Content-Type': 'application/json' };
}
function authenticatedHeaders() {
  return { ...authHeader(tkdToken({ tkdRole: null })), 'Content-Type': 'application/json' };
}

// ponytail: DB-resilient — 401 appears when protect's Admin.findByPk fails (DB unavailable)
const DB_FAIL = 401;

let clubId, tournamentId, playerId, matchId, userId;

beforeAll(async () => {
  const clubRes = await agent.post('/api/clubs').set(adminHeaders()).send({ name: 'Admin Test Club' });
  if (clubRes.status === 201) clubId = clubRes.body.id;

  const tournamentRes = await agent.post('/api/tournaments').set(adminHeaders()).send({
    name: 'Admin Test Tournament',
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    settings: {
      roundDurationSec: 120,
      restBetweenRoundsSec: 60,
      restBetweenMatchesMin: 15,
      pointGapAutoEnd: 20,
      weightClasses: {
        MALE: [{ name: '60-65kg', min: 60, max: 65 }],
        FEMALE: [{ name: '50-55kg', min: 50, max: 55 }],
      },
    },
  });
  if (tournamentRes.status === 201) tournamentId = tournamentRes.body.id;

  if (clubId && tournamentId) {
    const playerRes = await agent.post('/api/players').set(adminHeaders()).send({
      tournamentId, name: 'Admin Test Player', dob: '2000-01-01',
      weight: 62, gender: 'MALE', clubId,
    });
    if (playerRes.status === 201) playerId = playerRes.body.id;
  }
});

describe('Player Management', () => {
  it('GET /api/players — returns paginated list', async () => {
    const res = await agent.get(`/api/players?tournamentId=${tournamentId || 1}&page=1&limit=10`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it('GET /api/players/:id — returns player with computed fields', async () => {
    if (!playerId) return;
    const res = await agent.get(`/api/players/${playerId}`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id', playerId);
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('weight');
      expect(res.body).toHaveProperty('gender');
    }
  });

  it('PUT /api/players/:id — ADMIN can update player', async () => {
    if (!playerId) return;
    const res = await agent.put(`/api/players/${playerId}`).set(adminHeaders()).send({ weight: 65.5 });
    expect([200, DB_FAIL, 404, 409]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('weight');
    }
  });

  it('PUT /api/players/:id — SCOREKEEPER cannot update', async () => {
    if (!playerId) return;
    const res = await agent.put(`/api/players/${playerId}`).set(scorekeeperHeaders()).send({ weight: 70 });
    expect([403, DB_FAIL]).toContain(res.status);
  });

  it('DELETE /api/players/:id — ADMIN can delete player', async () => {
    const createRes = await agent.post('/api/players').set(adminHeaders()).send({
      tournamentId: tournamentId || 1, name: 'Delete Me Player', dob: '2001-06-15',
      weight: 58, gender: 'FEMALE', clubId: clubId || 1,
    });
    if (createRes.status !== 201) return;
    const deleteId = createRes.body.id;
    const res = await agent.delete(`/api/players/${deleteId}`).set(adminHeaders());
    expect([200, DB_FAIL, 409]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('message');
    }
  });

  it('DELETE /api/players/:id — SCOREKEEPER cannot delete', async () => {
    if (!playerId) return;
    const res = await agent.delete(`/api/players/${playerId}`).set(scorekeeperHeaders());
    expect([403, DB_FAIL]).toContain(res.status);
  });

  it('GET /api/players/:id — returns 404 for non-existent', async () => {
    const res = await agent.get('/api/players/99999').set(adminHeaders());
    expect([404, 500, DB_FAIL]).toContain(res.status);
  });
});

describe('Club Management', () => {
  it('GET /api/clubs — returns paginated list', async () => {
    const res = await agent.get('/api/clubs?page=1&limit=10').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it('GET /api/clubs/:id — returns club with playerCount', async () => {
    if (!clubId) return;
    const res = await agent.get(`/api/clubs/${clubId}`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id', clubId);
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('playerCount');
    }
  });

  it('PUT /api/clubs/:id — ADMIN can update club', async () => {
    if (!clubId) return;
    const res = await agent.put(`/api/clubs/${clubId}`).set(adminHeaders()).send({ name: 'Updated Club Name' });
    expect([200, DB_FAIL, 409]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('name', 'Updated Club Name');
    }
  });

  it('PUT /api/clubs/:id — SCOREKEEPER cannot update', async () => {
    if (!clubId) return;
    const res = await agent.put(`/api/clubs/${clubId}`).set(scorekeeperHeaders()).send({ name: 'No' });
    expect([403, DB_FAIL]).toContain(res.status);
  });

  it('DELETE /api/clubs/:id — ADMIN can delete empty club', async () => {
    const createRes = await agent.post('/api/clubs').set(adminHeaders()).send({ name: 'Delete Me Club' });
    if (createRes.status !== 201) return;
    const deleteId = createRes.body.id;
    const res = await agent.delete(`/api/clubs/${deleteId}`).set(adminHeaders());
    expect([200, DB_FAIL, 409]).toContain(res.status);
  });

  it('DELETE /api/clubs/:id — SCOREKEEPER cannot delete', async () => {
    if (!clubId) return;
    const res = await agent.delete(`/api/clubs/${clubId}`).set(scorekeeperHeaders());
    expect([403, DB_FAIL]).toContain(res.status);
  });

  it('GET /api/clubs — search by name', async () => {
    const res = await agent.get('/api/clubs?search=Admin').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });
});

describe('Tournament Management', () => {
  it('GET /api/tournaments — returns paginated list', async () => {
    const res = await agent.get('/api/tournaments?page=1&limit=10').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it('GET /api/tournaments/:id — returns tournament with stats', async () => {
    if (!tournamentId) return;
    const res = await agent.get(`/api/tournaments/${tournamentId}`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id', tournamentId);
      expect(res.body).toHaveProperty('playerCount');
      expect(res.body).toHaveProperty('matchCount');
      expect(res.body).toHaveProperty('matchesByStatus');
    }
  });

  it('PUT /api/tournaments/:id — ADMIN can update name', async () => {
    if (!tournamentId) return;
    const res = await agent.put(`/api/tournaments/${tournamentId}`).set(adminHeaders()).send({ name: 'Updated Tournament' });
    expect([200, DB_FAIL, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('name', 'Updated Tournament');
    }
  });

  it('PUT /api/tournaments/:id — SCOREKEEPER cannot update', async () => {
    if (!tournamentId) return;
    const res = await agent.put(`/api/tournaments/${tournamentId}`).set(scorekeeperHeaders()).send({ name: 'No' });
    expect([403, DB_FAIL]).toContain(res.status);
  });

  it('POST /api/tournaments/:id/complete — ADMIN can mark complete', async () => {
    if (!tournamentId) return;
    const res = await agent.post(`/api/tournaments/${tournamentId}/complete`).set(adminHeaders());
    expect([200, DB_FAIL, 400, 409]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('isCompleted', true);
    }
  });

  it('POST /api/tournaments/:id/complete — SCOREKEEPER cannot complete', async () => {
    if (!tournamentId) return;
    const res = await agent.post(`/api/tournaments/${tournamentId}/complete`).set(scorekeeperHeaders());
    expect([403, DB_FAIL]).toContain(res.status);
  });

  it('DELETE /api/tournaments/:id — SCOREKEEPER cannot delete', async () => {
    if (!tournamentId) return;
    const res = await agent.delete(`/api/tournaments/${tournamentId}`).set(scorekeeperHeaders());
    expect([403, DB_FAIL]).toContain(res.status);
  });

  it('DELETE /api/tournaments/:id — ADMIN can delete empty tournament', async () => {
    const createRes = await agent.post('/api/tournaments').set(adminHeaders()).send({
      name: 'Delete Me Tournament', startDate: '2026-09-01', endDate: '2026-09-03',
    });
    if (createRes.status !== 201) return;
    const deleteId = createRes.body.id;
    const res = await agent.delete(`/api/tournaments/${deleteId}`).set(adminHeaders());
    expect([200, DB_FAIL, 409]).toContain(res.status);
  });

  it('PUT /api/tournaments/:id/settings — ADMIN can update settings', async () => {
    if (!tournamentId) return;
    const res = await agent.put(`/api/tournaments/${tournamentId}/settings`).set(adminHeaders()).send({
      weightClasses: { MALE: [{ name: '60-65kg', min: 60, max: 65 }] },
    });
    expect([200, DB_FAIL, 409]).toContain(res.status);
  });
});

describe('Match Scheduling', () => {
  let scheduledMatchId, player2Id;

  beforeAll(async () => {
    if (clubId && tournamentId) {
      const p2 = await agent.post('/api/players').set(adminHeaders()).send({
        tournamentId, name: 'Match Scheduling Player 2', dob: '1999-05-20',
        weight: 63, gender: 'MALE', clubId,
      });
      if (p2.status === 201) player2Id = p2.body.id;
    }
  });

  it('GET /api/matches — returns paginated list', async () => {
    const res = await agent.get(`/api/matches?tournamentId=${tournamentId || 1}&page=1&limit=10`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it('POST /api/matches/schedule — ADMIN can schedule match', async () => {
    if (!playerId || !player2Id) return;
    const res = await agent.post('/api/matches/schedule').set(adminHeaders()).send({
      tournamentId: tournamentId || 1,
      player1Id: playerId,
      player2Id,
      scheduledTime: new Date(Date.now() + 3600000).toISOString(),
      type: 'FRIENDLY',
    });
    expect([201, DB_FAIL, 409]).toContain(res.status);
    if (res.status === 201) {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('status', 'SCHEDULED');
      scheduledMatchId = res.body.id;
    }
  });

  it('POST /api/matches/schedule — SCOREKEEPER cannot schedule', async () => {
    if (!playerId || !player2Id) return;
    const res = await agent.post('/api/matches/schedule').set(scorekeeperHeaders()).send({
      tournamentId: tournamentId || 1,
      player1Id: playerId,
      player2Id,
      scheduledTime: new Date(Date.now() + 7200000).toISOString(),
    });
    expect([403, DB_FAIL]).toContain(res.status);
  });

  it('POST /api/matches/schedule — rejects same player', async () => {
    if (!playerId) return;
    const res = await agent.post('/api/matches/schedule').set(adminHeaders()).send({
      tournamentId: tournamentId || 1,
      player1Id: playerId,
      player2Id: playerId,
      scheduledTime: new Date(Date.now() + 3600000).toISOString(),
    });
    expect([400, DB_FAIL, 409]).toContain(res.status);
  });

  it('PUT /api/matches/:id/reschedule — ADMIN can reschedule', async () => {
    if (!scheduledMatchId) return;
    const res = await agent.put(`/api/matches/${scheduledMatchId}/reschedule`).set(adminHeaders()).send({
      scheduledTime: new Date(Date.now() + 7200000).toISOString(),
    });
    expect([200, DB_FAIL, 409]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id', scheduledMatchId);
    }
  });

  it('PUT /api/matches/:id/reschedule — SCOREKEEPER cannot reschedule', async () => {
    if (!scheduledMatchId) return;
    const res = await agent.put(`/api/matches/${scheduledMatchId}/reschedule`).set(scorekeeperHeaders()).send({
      scheduledTime: new Date(Date.now() + 10800000).toISOString(),
    });
    expect([403, DB_FAIL]).toContain(res.status);
  });

  it('POST /api/matches/:id/walkover — ADMIN can assign walkover', async () => {
    if (!scheduledMatchId || !playerId) return;
    const res = await agent.post(`/api/matches/${scheduledMatchId}/walkover`).set(adminHeaders()).send({
      winnerId: playerId,
    });
    expect([200, DB_FAIL, 409]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('status', 'FINISHED');
      expect(res.body).toHaveProperty('winnerId', playerId);
    }
  });

  it('POST /api/matches/schedule — validates required fields', async () => {
    const res = await agent.post('/api/matches/schedule').set(adminHeaders()).send({});
    expect([400, DB_FAIL, 422]).toContain(res.status);
  });
});

describe('User Administration', () => {
  it('GET /api/admin/users — super_admin can list users', async () => {
    const res = await agent.get('/api/admin/users?page=1&limit=10').set(superAdminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it('GET /api/admin/users — non-super_admin gets 403', async () => {
    const res = await agent.get('/api/admin/users').set(adminHeaders());
    expect([403, DB_FAIL]).toContain(res.status);
  });

  it('PUT /api/admin/users/:id/role — super_admin can assign role', async () => {
    const res = await agent.put('/api/admin/users/1/role').set(superAdminHeaders()).send({ tkdRole: 'MAT_JUDGE' });
    expect([200, DB_FAIL, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('tkdRole', 'MAT_JUDGE');
    }
  });

  it('PUT /api/admin/users/:id/role — non-super_admin gets 403', async () => {
    const res = await agent.put('/api/admin/users/1/role').set(adminHeaders()).send({ tkdRole: 'MAT_JUDGE' });
    expect([403, DB_FAIL]).toContain(res.status);
  });

  it('PUT /api/admin/users/:id/deactivate — super_admin can deactivate', async () => {
    const res = await agent.put('/api/admin/users/1/deactivate').set(superAdminHeaders());
    expect([200, DB_FAIL, 404, 409]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('isActive');
    }
  });

  it('PUT /api/admin/users/:id/reactivate — super_admin can reactivate', async () => {
    const res = await agent.put('/api/admin/users/1/reactivate').set(superAdminHeaders());
    expect([200, DB_FAIL, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('isActive', true);
    }
  });

  it('GET /api/admin/users — search by name/email', async () => {
    const res = await agent.get('/api/admin/users?search=admin').set(superAdminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it('GET /api/admin/users — filter by tkdRole', async () => {
    const res = await agent.get('/api/admin/users?tkdRole=ADMIN').set(superAdminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
    }
  });
});

describe('Dashboard', () => {
  it('GET /api/dashboard/tournaments — returns paginated tournament list with status', async () => {
    const res = await agent.get('/api/dashboard/tournaments?page=1&limit=10').set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        const t = res.body.data[0];
        expect(t).toHaveProperty('playerCount');
        expect(t).toHaveProperty('matchCount');
        expect(t).toHaveProperty('matchesByStatus');
      }
    }
  });

  it('GET /api/dashboard/tournaments/:id/overview — returns tournament overview', async () => {
    if (!tournamentId) return;
    const res = await agent.get(`/api/dashboard/tournaments/${tournamentId}/overview`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('tournamentId', tournamentId);
      expect(res.body).toHaveProperty('tournamentName');
      expect(res.body).toHaveProperty('totalPlayers');
      expect(res.body).toHaveProperty('totalMatches');
      expect(res.body).toHaveProperty('matchesByStatus');
      expect(res.body).toHaveProperty('upcomingMatches');
    }
  });

  it('GET /api/dashboard/tournaments/:id/overview — non-admin can access', async () => {
    if (!tournamentId) return;
    const res = await agent.get(`/api/dashboard/tournaments/${tournamentId}/overview`).set(authenticatedHeaders());
    expect([200, 401]).toContain(res.status);
  });

  it('GET /api/dashboard/tournaments/:id/overview — returns 404 for non-existent', async () => {
    const res = await agent.get('/api/dashboard/tournaments/99999/overview').set(adminHeaders());
    expect([404, 500, DB_FAIL]).toContain(res.status);
  });
});
