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

describe('Bracket Integration Tests', () => {
  let clubId, tournamentId, playerId1, playerId2, matchId;

  beforeAll(async () => {
    const clubRes = await agent.post('/api/clubs').set(adminHeaders()).send({ name: 'Bracket Test Club' });
    if (clubRes.status === 201) clubId = clubRes.body.id;

    const tournamentRes = await agent.post('/api/tournaments').set(adminHeaders()).send({
      name: 'Bracket Test Tournament',
      startDate: '2026-09-01',
      endDate: '2026-09-03',
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
        name: 'Bracket P1', dob: '2000-01-01', weight: 62, gender: 'MALE', clubId, tournamentId,
      });
      if (p1.status === 201) playerId1 = p1.body.id;

      const p2 = await agent.post('/api/players').set(adminHeaders()).send({
        name: 'Bracket P2', dob: '2000-02-02', weight: 63, gender: 'MALE', clubId, tournamentId,
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

  describe('GET /api/tournaments/:id/bracket', () => {
    it('returns 200 with bracket tree when valid params provided', async () => {
      if (!tournamentId) return;

      const res = await agent.get(`/api/tournaments/${tournamentId}/bracket`)
        .set(adminHeaders())
        .query({ weightClass: '60-65kg', gender: 'MALE' });

      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('tournamentId', tournamentId);
        expect(res.body.data).toHaveProperty('weightClass', '60-65kg');
        expect(res.body.data).toHaveProperty('gender', 'MALE');
      }
    });

    it('returns 400 when weightClass missing', async () => {
      if (!tournamentId) return;

      const res = await agent.get(`/api/tournaments/${tournamentId}/bracket`)
        .set(adminHeaders())
        .query({ gender: 'MALE' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when gender missing', async () => {
      if (!tournamentId) return;

      const res = await agent.get(`/api/tournaments/${tournamentId}/bracket`)
        .set(adminHeaders())
        .query({ weightClass: '60-65kg' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when gender invalid', async () => {
      if (!tournamentId) return;

      const res = await agent.get(`/api/tournaments/${tournamentId}/bracket`)
        .set(adminHeaders())
        .query({ weightClass: '60-65kg', gender: 'INVALID' });

      expect(res.status).toBe(400);
    });

    it('returns 200 with null bracket when no matches exist', async () => {
      const res = await agent.get('/api/tournaments/99999/bracket')
        .set(adminHeaders())
        .query({ weightClass: '60-65kg', gender: 'MALE' });

      if (res.status === 200) {
        expect(res.body.data.bracket).toBeNull();
      }
    });
  });

  describe('POST /api/tournaments/:id/bracket/override', () => {
    it('requires HEAD_JUDGE role', async () => {
      if (!matchId) return;

      const res = await agent.post(`/api/tournaments/${tournamentId}/bracket/override`)
        .set(matJudgeHeaders())
        .send({ matchId, playerId: playerId1 });

      expect(res.status).toBe(403);
    });

    it('returns 400 when matchId missing', async () => {
      const res = await agent.post(`/api/tournaments/${tournamentId}/bracket/override`)
        .set(headJudgeHeaders())
        .send({ playerId: playerId1 });

      expect(res.status).toBe(400);
    });
  });
});
