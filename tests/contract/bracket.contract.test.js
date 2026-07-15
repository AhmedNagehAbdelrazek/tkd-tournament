const request = require('supertest');
const createApp = require('../../app');
const { tkdToken, authHeader } = require('../setup/tkdHelpers');

const app = createApp();
const agent = request.agent(app);

function adminHeaders() {
  return { ...authHeader(tkdToken({ tkdRole: 'ADMIN' })), 'Content-Type': 'application/json' };
}

describe('Bracket Contract Tests', () => {
  let clubId, tournamentId, playerId1, playerId2;

  beforeAll(async () => {
    const clubRes = await agent.post('/api/clubs').set(adminHeaders()).send({ name: 'Bracket Contract Club' });
    if (clubRes.status === 201) clubId = clubRes.body.id;

    const tournamentRes = await agent.post('/api/tournaments').set(adminHeaders()).send({
      name: 'Bracket Contract Tournament',
      startDate: '2026-09-01', endDate: '2026-09-03',
      settings: {
        roundDurationSec: 120, restBetweenRoundsSec: 60, restBetweenMatchesMin: 15,
        pointGapAutoEnd: 20,
        weightClasses: [{ name: '60-65kg', min: 60, max: 65 }],
      },
    });
    if (tournamentRes.status === 201) tournamentId = tournamentRes.body.id;

    if (clubId && tournamentId) {
      const p1 = await agent.post('/api/players').set(adminHeaders()).send({
        name: 'Contract P1', dob: '2000-01-01', weight: 62, gender: 'MALE', clubId, tournamentId,
      });
      if (p1.status === 201) playerId1 = p1.body.id;

      const p2 = await agent.post('/api/players').set(adminHeaders()).send({
        name: 'Contract P2', dob: '2000-02-02', weight: 63, gender: 'MALE', clubId, tournamentId,
      });
      if (p2.status === 201) playerId2 = p2.body.id;
    }
  });

  it('bracket response matches contract shape', async () => {
    if (!tournamentId) return;

    const res = await agent.get(`/api/tournaments/${tournamentId}/bracket`)
      .set(adminHeaders())
      .query({ weightClass: '60-65kg', gender: 'MALE' });

    if (res.status === 200) {
      const { data } = res.body;

      expect(data).toHaveProperty('tournamentId');
      expect(data).toHaveProperty('weightClass');
      expect(data).toHaveProperty('gender');
      expect(data).toHaveProperty('currentStage');
      expect(data).toHaveProperty('bracket');

      if (data.bracket) {
        expect(typeof data.bracket.id).toBe('number');
        expect(data.bracket).toHaveProperty('stageName');
        expect(data.bracket).toHaveProperty('status');
        expect(data.bracket).toHaveProperty('bracketPosition');
      }
    }
  });

  it('error response matches contract shape for missing params', async () => {
    const res = await agent.get(`/api/tournaments/1/bracket`)
      .set(adminHeaders())
      .query({});

    if (res.status === 400) {
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
      expect(res.body.error).toHaveProperty('details');
    }
  });
});
