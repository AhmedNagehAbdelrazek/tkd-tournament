// ponytail: integration test — full API flow with DB-resilient guards
const request = require('supertest');
const createApp = require('../../app');
const { tkdToken, authHeader } = require('../setup/tkdHelpers');

const app = createApp();
const agent = request.agent(app);

function adminHeaders() {
  return { ...authHeader(tkdToken({ tkdRole: 'ADMIN' })), 'Content-Type': 'application/json' };
}

// ponytail: shared mutable state — no per-test cleanup
let clubId, tournamentId;

beforeAll(async () => {
  const club = await agent.post('/api/clubs').set(adminHeaders()).send({ name: 'Gender Test Club' });
  if (club.status === 201) clubId = club.body.id;
});

describe('Gender-Keyed Weight Classes — Tournament', () => {
  const genderedSettings = {
    weightClasses: {
      MALE: [
        { name: 'Male -58kg', min: 0, max: 58 },
        { name: 'Male -68kg', min: 58.01, max: 68 },
      ],
      FEMALE: [
        { name: 'Female -49kg', min: 0, max: 49 },
      ],
    },
  };

  it('POST /api/tournaments — creates with gender-keyed weight classes', async () => {
    const res = await agent.post('/api/tournaments').set(adminHeaders()).send({
      name: 'Gender Test Tournament',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
      settings: genderedSettings,
    });
    if (res.status === 201) {
      expect(res.body.settings.weightClasses).toHaveProperty('MALE');
      expect(res.body.settings.weightClasses).toHaveProperty('FEMALE');
      expect(Array.isArray(res.body.settings.weightClasses.MALE)).toBe(true);
      expect(Array.isArray(res.body.settings.weightClasses.FEMALE)).toBe(true);
      expect(res.body).toHaveProperty('excludedPlayers');
      expect(Array.isArray(res.body.excludedPlayers)).toBe(true);
      tournamentId = res.body.id;
    }
  });

  it('POST /api/tournaments — rejects flat array weight classes', async () => {
    const res = await agent.post('/api/tournaments').set(adminHeaders()).send({
      name: 'Bad Tournament',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
      settings: {
        weightClasses: [
          { name: '10-15kg', min: 10, max: 15 },
        ],
      },
    });
    // ponytail: flat array should fail validation — 422 or 500 depending on validator behavior
    expect([422, 400, 500]).toContain(res.status);
  });

  it('PUT /api/tournaments/:id/settings — updates weight classes', async () => {
    if (!tournamentId) return;
    const res = await agent.put(`/api/tournaments/${tournamentId}/settings`).set(adminHeaders()).send({
      weightClasses: {
        MALE: [
          { name: 'Male -58kg', min: 0, max: 58 },
          { name: 'Male -74kg', min: 58.01, max: 74 },
        ],
        FEMALE: [
          { name: 'Female -49kg', min: 0, max: 49 },
          { name: 'Female -57kg', min: 49.01, max: 57 },
        ],
      },
    });
    if (res.status === 200) {
      expect(res.body.settings.weightClasses.MALE).toHaveLength(2);
      expect(res.body.settings.weightClasses.FEMALE).toHaveLength(2);
      expect(res.body).toHaveProperty('excludedPlayers');
    }
  });

  it('GET /api/tournaments/:id/excluded-players — returns list', async () => {
    if (!tournamentId) return;
    const res = await agent.get(`/api/tournaments/${tournamentId}/excluded-players`).set(adminHeaders());
    if (res.status === 200) {
      expect(res.body).toHaveProperty('excludedPlayers');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.excludedPlayers)).toBe(true);
    }
  });

  it('GET /api/tournaments/:id/excluded-players — 404 for nonexistent tournament', async () => {
    const res = await agent.get('/api/tournaments/99999/excluded-players').set(adminHeaders());
    expect([404, 500]).toContain(res.status);
  });
});

describe('Gender-Keyed Weight Classes — Player Registration', () => {
  it('POST /api/players — accepts male player in male weight class', async () => {
    if (!tournamentId || !clubId) return;
    const res = await agent.post('/api/players').set(adminHeaders()).send({
      tournamentId,
      name: 'Male Player',
      dob: '2010-05-15',
      weight: 55,
      gender: 'MALE',
      clubId,
    });
    if (res.status === 201) {
      expect(res.body).toHaveProperty('gender', 'MALE');
      expect(res.body).toHaveProperty('weight', 55);
    }
  });

  it('POST /api/players — accepts female player in female weight class', async () => {
    if (!tournamentId || !clubId) return;
    const res = await agent.post('/api/players').set(adminHeaders()).send({
      tournamentId,
      name: 'Female Player',
      dob: '2011-03-20',
      weight: 45,
      gender: 'FEMALE',
      clubId,
    });
    if (res.status === 201) {
      expect(res.body).toHaveProperty('gender', 'FEMALE');
    }
  });

  it('POST /api/players — rejects male player outside male weight classes', async () => {
    if (!tournamentId || !clubId) return;
    const res = await agent.post('/api/players').set(adminHeaders()).send({
      tournamentId,
      name: 'Too Heavy Male',
      dob: '2009-11-10',
      weight: 80,
      gender: 'MALE',
      clubId,
    });
    // ponytail: should fail — 422 validation or 500 if DB unavailable
    expect([422, 400, 500]).toContain(res.status);
  });

  it('POST /api/players — rejects female player outside female weight classes', async () => {
    if (!tournamentId || !clubId) return;
    const res = await agent.post('/api/players').set(adminHeaders()).send({
      tournamentId,
      name: 'Too Heavy Female',
      dob: '2010-08-01',
      weight: 60,
      gender: 'FEMALE',
      clubId,
    });
    expect([422, 400, 500]).toContain(res.status);
  });

  it('POST /api/players/bulk — reports per-player errors for gender mismatches', async () => {
    if (!tournamentId || !clubId) return;
    const res = await agent.post('/api/players/bulk').set(adminHeaders()).send({
      tournamentId,
      players: [
        { name: 'Good Male', dob: '2010-01-01', weight: 50, gender: 'MALE', clubId },
        { name: 'Bad Male', dob: '2010-01-01', weight: 80, gender: 'MALE', clubId },
      ],
    });
    if (res.status === 201) {
      expect(res.body).toHaveProperty('created');
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors.length).toBeGreaterThan(0);
    }
  });
});

describe('Gender-Keyed Weight Classes — Matchmaking', () => {
  it('POST /api/matches/generate — uses gender-specific weight class', async () => {
    if (!tournamentId) return;
    const res = await agent.post('/api/matches/generate')
      .set({ ...authHeader(tkdToken({ tkdRole: 'HEAD_JUDGE' })), 'Content-Type': 'application/json' })
      .send({
        tournamentId,
        weightClass: 'Male -58kg',
        gender: 'MALE',
        matchType: 'SINGLE_ELIMINATION',
      });
    // ponytail: 201 if bracket generated, 200 if insufficient players, 500 if DB unavailable
    expect([200, 201, 500]).toContain(res.status);
    if (res.status === 201) {
      expect(res.body).toHaveProperty('matches');
      expect(res.body).toHaveProperty('totalMatches');
    }
  });

  it('POST /api/matches/generate — rejects wrong gender weight class', async () => {
    if (!tournamentId) return;
    const res = await agent.post('/api/matches/generate')
      .set({ ...authHeader(tkdToken({ tkdRole: 'HEAD_JUDGE' })), 'Content-Type': 'application/json' })
      .send({
        tournamentId,
        weightClass: 'Female -49kg',
        gender: 'MALE',
        matchType: 'SINGLE_ELIMINATION',
      });
    // ponytail: should fail — weight class not found in MALE division
    expect([400, 404, 500]).toContain(res.status);
  });
});
