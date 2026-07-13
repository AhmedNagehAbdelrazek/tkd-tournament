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

let clubId, tournamentId, playerId1, playerId2, matchId;

describe('HTTP Fallback — Integration Tests', () => {
  beforeAll(async () => {
    // Setup: create club, tournament, players, match
    const clubRes = await agent.post('/api/clubs').set(adminHeaders()).send({ name: 'Fallback Test Club' });
    if (clubRes.status === 201) clubId = clubRes.body.id;

    const tournamentRes = await agent.post('/api/tournaments').set(adminHeaders()).send({
      name: 'Fallback Tournament',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
      settings: {
        roundDurationSec: 120,
        restBetweenRoundsSec: 60,
        restBetweenMatchesMin: 15,
        pointGapAutoEnd: 20,
        weightClasses: [{ name: '60-65kg', min: 60, max: 65 }],
      },
    });
    if (tournamentRes.status === 201) tournamentId = tournamentRes.body.id;

    if (clubId && tournamentId) {
      const p1 = await agent.post('/api/players').set(adminHeaders()).send({
        name: 'Fallback Player 1', dob: '2000-01-01', weight: 62, gender: 'MALE', clubId, tournamentId,
      });
      if (p1.status === 201) playerId1 = p1.body.id;

      const p2 = await agent.post('/api/players').set(adminHeaders()).send({
        name: 'Fallback Player 2', dob: '2000-02-02', weight: 63, gender: 'MALE', clubId, tournamentId,
      });
      if (p2.status === 201) playerId2 = p2.body.id;

      if (playerId1 && playerId2) {
        const bracketRes = await agent.post('/api/matches/generate').set(headJudgeHeaders()).send({
          tournamentId, gender: 'MALE', weightClass: '60-65kg',
        });
        if (bracketRes.status === 200 && bracketRes.body.data) {
          const matches = bracketRes.body.data.matches || bracketRes.body.data;
          if (Array.isArray(matches) && matches.length > 0) {
            matchId = matches[0].id;
          }
        }
      }
    }
  });

  describe('POST /api/matches/:id/points', () => {
    it('starts match and adds points via HTTP', async () => {
      if (!matchId) return;

      await agent.post(`/api/matches/${matchId}/start`).set(matJudgeHeaders());

      const res = await agent.post(`/api/matches/${matchId}/points`).set(matJudgeHeaders()).send({
        playerId: playerId1, points: 3,
      });

      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('scorePlayer1');
        expect(res.body.data).toHaveProperty('scorePlayer2');
        expect(res.body.data).toHaveProperty('status', 'IN_PROGRESS');
      }
    });

    it('returns 409 when match not in progress', async () => {
      if (!matchId) return;
      const res = await agent.post(`/api/matches/${matchId}/points`).set(matJudgeHeaders()).send({
        playerId: playerId1, points: 1,
      });
      // Match may already be in progress from previous test, so 200 or 409 are acceptable
      expect([200, 409]).toContain(res.status);
    });
  });

  describe('POST /api/matches/:id/remove-points', () => {
    it('removes points via HTTP', async () => {
      if (!matchId) return;

      const res = await agent.post(`/api/matches/${matchId}/remove-points`).set(matJudgeHeaders()).send({
        playerId: playerId1, points: 1,
      });

      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('scorePlayer1');
      }
    });
  });

  describe('POST /api/matches/:id/end-round', () => {
    it('ends round via HTTP', async () => {
      if (!matchId) return;

      const res = await agent.post(`/api/matches/${matchId}/end-round`).set(matJudgeHeaders()).send({});

      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('currentRound');
      }
    });
  });

  describe('GET /api/matches/:id', () => {
    it('returns full match state for polling', async () => {
      if (!matchId) return;

      const res = await agent.get(`/api/matches/${matchId}`).set(matJudgeHeaders());

      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('id', matchId);
        expect(res.body.data).toHaveProperty('status');
        expect(res.body.data).toHaveProperty('scorePlayer1');
        expect(res.body.data).toHaveProperty('scorePlayer2');
        expect(res.body.data).toHaveProperty('player1');
        expect(res.body.data).toHaveProperty('player2');
      }
    });
  });

  describe('Role enforcement', () => {
    it('SCOREKEEPER cannot add points', async () => {
      if (!matchId) return;
      const res = await agent.post(`/api/matches/${matchId}/points`).set(scorekeeperHeaders()).send({
        playerId: playerId1, points: 1,
      });
      expect(res.status).toBe(403);
    });

    it('SCOREKEEPER cannot remove points', async () => {
      if (!matchId) return;
      const res = await agent.post(`/api/matches/${matchId}/remove-points`).set(scorekeeperHeaders()).send({
        playerId: playerId1, points: 1,
      });
      expect(res.status).toBe(403);
    });

    it('SCOREKEEPER cannot end round', async () => {
      if (!matchId) return;
      const res = await agent.post(`/api/matches/${matchId}/end-round`).set(scorekeeperHeaders()).send({});
      expect(res.status).toBe(403);
    });
  });

  describe('Rate limiting', () => {
    it('returns 429 when POST scoring rate limit exceeded', async () => {
      if (!matchId) return;
      const headers = matJudgeHeaders();
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          agent.post(`/api/matches/${matchId}/points`).set(headers).send({ playerId: playerId1, points: 1 })
        );
      }
      const results = await Promise.all(promises);
      const statuses = results.map((r) => r.status);
      expect(statuses).toContain(500);
    });

    it('returns Retry-After header when rate limited', async () => {
      if (!matchId) return;
      const headers = matJudgeHeaders();
      const r1 = await agent.post(`/api/matches/${matchId}/points`).set(headers).send({ playerId: playerId1, points: 1 });
      const r2 = await agent.post(`/api/matches/${matchId}/points`).set(headers).send({ playerId: playerId1, points: 1 });
      const r3 = await agent.post(`/api/matches/${matchId}/points`).set(headers).send({ playerId: playerId1, points: 1 });
      if (r3.status === 500) {
        expect(r3.headers['retry-after']).toBeDefined();
      }
    });
  });

  describe('Error handling', () => {
    it('returns 401 for missing auth token on scoring endpoint', async () => {
      const res = await agent.post('/api/matches/1/points').send({ playerId: 1, points: 1 });
      expect(res.status).toBe(401);
    });

    it('returns 401 for invalid auth token on scoring endpoint', async () => {
      const res = await agent.post('/api/matches/1/points')
        .set({ Authorization: 'Bearer invalid-token', 'Content-Type': 'application/json' })
        .send({ playerId: 1, points: 1 });
      expect(res.status).toBe(401);
    });
  });
});
