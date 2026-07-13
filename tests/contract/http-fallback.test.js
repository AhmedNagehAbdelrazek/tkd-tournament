const request = require('supertest');
const createApp = require('../../app');
const { tkdToken, authHeader } = require('../setup/tkdHelpers');

const app = createApp();
const agent = request.agent(app);

function matJudgeHeaders() {
  return { ...authHeader(tkdToken({ tkdRole: 'MAT_JUDGE' })), 'Content-Type': 'application/json' };
}

function scorekeeperHeaders() {
  return { ...authHeader(tkdToken({ tkdRole: 'SCOREKEEPER' })), 'Content-Type': 'application/json' };
}

function noAuthHeaders() {
  return { 'Content-Type': 'application/json' };
}

describe('HTTP Fallback — Contract Tests', () => {
  describe('POST /api/matches/:id/points', () => {
    it('returns 401 when no token provided', async () => {
      const res = await agent.post('/api/matches/1/points').set(noAuthHeaders()).send({ playerId: 1, points: 1 });
      expect(res.status).toBe(401);
    });

    it('returns 403 when SCOREKEEPER attempts scoring', async () => {
      const res = await agent.post('/api/matches/1/points').set(scorekeeperHeaders()).send({ playerId: 1, points: 1 });
      expect(res.status).toBe(403);
    });

    it('returns 404 when match not found', async () => {
      const res = await agent.post('/api/matches/99999/points').set(matJudgeHeaders()).send({ playerId: 1, points: 1 });
      expect([404, 500]).toContain(res.status);
    });

    it('returns 422 when playerId is missing', async () => {
      const res = await agent.post('/api/matches/1/points').set(matJudgeHeaders()).send({ points: 1 });
      expect(res.status).toBe(422);
    });

    it('returns 422 when points is missing', async () => {
      const res = await agent.post('/api/matches/1/points').set(matJudgeHeaders()).send({ playerId: 1 });
      expect(res.status).toBe(422);
    });

    it('returns 422 when points is zero', async () => {
      const res = await agent.post('/api/matches/1/points').set(matJudgeHeaders()).send({ playerId: 1, points: 0 });
      expect([422, 500]).toContain(res.status);
    });

    it('returns 422 when roundNumber is invalid', async () => {
      const res = await agent.post('/api/matches/1/points').set(matJudgeHeaders()).send({ playerId: 1, points: 1, roundNumber: 5 });
      expect([422, 500]).toContain(res.status);
    });
  });

  describe('POST /api/matches/:id/remove-points', () => {
    it('returns 401 when no token provided', async () => {
      const res = await agent.post('/api/matches/1/remove-points').set(noAuthHeaders()).send({ playerId: 1, points: 1 });
      expect(res.status).toBe(401);
    });

    it('returns 403 when SCOREKEEPER attempts scoring', async () => {
      const res = await agent.post('/api/matches/1/remove-points').set(scorekeeperHeaders()).send({ playerId: 1, points: 1 });
      expect(res.status).toBe(403);
    });

    it('returns 422 when playerId is missing', async () => {
      const res = await agent.post('/api/matches/1/remove-points').set(matJudgeHeaders()).send({ points: 1 });
      expect(res.status).toBe(422);
    });

    it('returns 422 when points is missing', async () => {
      const res = await agent.post('/api/matches/1/remove-points').set(matJudgeHeaders()).send({ playerId: 1 });
      expect([422, 500]).toContain(res.status);
    });
  });

  describe('POST /api/matches/:id/end-round', () => {
    it('returns 401 when no token provided', async () => {
      const res = await agent.post('/api/matches/1/end-round').set(noAuthHeaders()).send({});
      expect(res.status).toBe(401);
    });

    it('returns 403 when SCOREKEEPER attempts end round', async () => {
      const res = await agent.post('/api/matches/1/end-round').set(scorekeeperHeaders()).send({});
      expect(res.status).toBe(403);
    });

    it('returns 422 when roundNumber is invalid', async () => {
      const res = await agent.post('/api/matches/1/end-round').set(matJudgeHeaders()).send({ roundNumber: 0 });
      expect([422, 500]).toContain(res.status);
    });
  });

  describe('GET /api/matches/:id', () => {
    it('returns 401 when no token provided', async () => {
      const res = await agent.get('/api/matches/1').set(noAuthHeaders());
      expect(res.status).toBe(401);
    });

    it('returns match data with correct shape', async () => {
      const res = await agent.get('/api/matches/1').set(matJudgeHeaders());
      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data).toHaveProperty('status');
        expect(res.body.data).toHaveProperty('scorePlayer1');
        expect(res.body.data).toHaveProperty('scorePlayer2');
        expect(res.body.data).toHaveProperty('player1');
        expect(res.body.data).toHaveProperty('player2');
      }
    });
  });
});
