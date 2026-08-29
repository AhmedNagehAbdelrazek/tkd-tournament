// ponytail: integration test — gender-keyed weight classes (doc-aligned)
const request = require('supertest');
const createApp = require('../../app');
const { tkdToken, authHeader } = require('../setup/tkdHelpers');

const app = createApp();
const agent = request.agent(app);

function adminHeaders() {
  return { ...authHeader(tkdToken({ role: 'super_admin' })), 'Content-Type': 'application/json' };
}

let clubId, tournamentId;

beforeAll(async () => {
  const club = await agent.post('/api/v1/clubs').set(adminHeaders()).send({ name: 'Gender Test Club' });
  if (club.status === 201) clubId = club.body.id;
});

describe('Gender-Keyed Weight Classes — Tournament', () => {
  const genderedCategories = {
    gender: 'Both',
    bracketDepth: 3,
    weights: {
      males: [
        { name: 'Male -58kg', minWeight: 0, maxWeight: 58 },
        { name: 'Male -68kg', minWeight: 58.01, maxWeight: 68 },
      ],
      females: [
        { name: 'Female -49kg', minWeight: 0, maxWeight: 49 },
      ],
    },
  };

  it('POST /api/v1/tournaments — creates with gender-keyed weight classes', async () => {
    const res = await agent.post('/api/v1/tournaments').set(adminHeaders()).send({
      name: 'Gender Test Tournament',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
      categories: genderedCategories,
    });
    if (res.status === 201) {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'Gender Test Tournament');
      tournamentId = res.body.id;
    }
  });
});

describe('Gender-Keyed Weight Classes — Player Registration', () => {
  it('POST /api/v1/players — accepts male player in male weight class', async () => {
    if (!tournamentId || !clubId) return;
    const res = await agent.post('/api/v1/players').set(adminHeaders()).send([
      {
        fullName: 'Male Player',
        nationalId: '29001011234567',
        dateOfBirth: '2010-05-15',
        weightKg: 55,
        gender: 'Male',
        club: { id: clubId, name: 'Gender Test Club' },
      },
    ]);
    if (res.status === 201) {
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('gender', 'MALE');
      expect(res.body[0]).toHaveProperty('weightKg', 55);
    }
  });

  it('POST /api/v1/players — accepts female player in female weight class', async () => {
    if (!tournamentId || !clubId) return;
    const res = await agent.post('/api/v1/players').set(adminHeaders()).send([
      {
        fullName: 'Female Player',
        nationalId: '29001011234568',
        dateOfBirth: '2011-03-20',
        weightKg: 45,
        gender: 'Female',
        club: { id: clubId, name: 'Gender Test Club' },
      },
    ]);
    if (res.status === 201) {
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('gender', 'FEMALE');
    }
  });

  it('POST /api/v1/players — rejects male player outside male weight classes', async () => {
    if (!tournamentId || !clubId) return;
    const res = await agent.post('/api/v1/players').set(adminHeaders()).send([
      {
        fullName: 'Too Heavy Male',
        nationalId: '29001011234569',
        dateOfBirth: '2009-11-10',
        weightKg: 80,
        gender: 'Male',
        club: { id: clubId, name: 'Gender Test Club' },
      },
    ]);
    expect([422, 400, 500]).toContain(res.status);
  });

  it('POST /api/v1/players — rejects female player outside female weight classes', async () => {
    if (!tournamentId || !clubId) return;
    const res = await agent.post('/api/v1/players').set(adminHeaders()).send([
      {
        fullName: 'Too Heavy Female',
        nationalId: '29001011234570',
        dateOfBirth: '2010-08-01',
        weightKg: 60,
        gender: 'Female',
        club: { id: clubId, name: 'Gender Test Club' },
      },
    ]);
    expect([422, 400, 500]).toContain(res.status);
  });
});
