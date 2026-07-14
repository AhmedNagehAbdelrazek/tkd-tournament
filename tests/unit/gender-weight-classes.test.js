// ponytail: unit tests for pure functions only — DB-dependent logic tested in integration
const { validateWeight, calculateAge, yearOfBirth } = require('../../Services/playerService');
const { buildExclusionReason } = require('../../Services/tournamentService');

// ponytail: mock tournament object — no DB needed
function mockTournament(weightClasses) {
  return { settings: { weightClasses } };
}

function mockPlayer(gender, weight) {
  return { gender, weight };
}

describe('validateWeight — gender-aware', () => {
  // ponytail: disjoint ranges — so we can test cross-gender isolation
  const tournament = mockTournament({
    MALE: [
      { name: 'Male -68kg', min: 58, max: 68 },
      { name: 'Male -80kg', min: 68.01, max: 80 },
    ],
    FEMALE: [
      { name: 'Female -49kg', min: 0, max: 49 },
      { name: 'Female -57kg', min: 49.01, max: 57 },
    ],
  });

  it('accepts weight within gender-specific class', () => {
    const wc = validateWeight(tournament, 62, 'MALE');
    expect(wc.name).toBe('Male -68kg');
  });

  it('accepts weight at exact boundary (inclusive)', () => {
    const wc = validateWeight(tournament, 58, 'MALE');
    expect(wc.name).toBe('Male -68kg');
  });

  it('rejects weight outside all gender-specific classes', () => {
    expect(() => validateWeight(tournament, 90, 'MALE')).toThrow('90kg');
    expect(() => validateWeight(tournament, 90, 'MALE')).toThrow('MALE');
  });

  it('rejects when gender has no weight classes', () => {
    const empty = mockTournament({ MALE: [], FEMALE: [] });
    expect(() => validateWeight(empty, 50, 'MALE')).toThrow('No weight classes configured');
  });

  it('does not match cross-gender classes', () => {
    // 45kg is in Female -49kg but should NOT match for MALE (MALE starts at 58)
    expect(() => validateWeight(tournament, 45, 'MALE')).toThrow('MALE');
  });

  it('matches female classes independently', () => {
    const wc = validateWeight(tournament, 45, 'FEMALE');
    expect(wc.name).toBe('Female -49kg');
  });
});

describe('buildExclusionReason', () => {
  it('reports available ranges when classes exist', () => {
    const tournament = mockTournament({
      MALE: [{ name: 'Male -58kg', min: 0, max: 58 }],
      FEMALE: [],
    });
    const player = mockPlayer('MALE', 75);
    const reason = buildExclusionReason(player, tournament);
    expect(reason).toContain('MALE');
    expect(reason).toContain('75kg');
    expect(reason).toContain('Male -58kg');
  });

  it('reports no classes configured when gender array is empty', () => {
    const tournament = mockTournament({ MALE: [], FEMALE: [] });
    const player = mockPlayer('FEMALE', 50);
    const reason = buildExclusionReason(player, tournament);
    expect(reason).toContain('No weight classes configured for FEMALE');
  });
});

describe('calculateAge', () => {
  it('computes age from dob', () => {
    const age = calculateAge('2010-06-15');
    expect(typeof age).toBe('number');
    expect(age).toBeGreaterThan(0);
  });
});

describe('yearOfBirth', () => {
  it('extracts year from dob', () => {
    expect(yearOfBirth('2010-06-15')).toBe(2010);
  });
});
