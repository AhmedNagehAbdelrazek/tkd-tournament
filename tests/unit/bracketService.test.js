const {
  progressWinner,
  buildTreeFromMatches,
  determineCurrentStage,
  overrideNextMatchSlot,
} = require('../../Services/bracketService');
const { Match } = require('../../Models');
const { MATCH_STATUS } = require('../../config/constants');

jest.mock('../../Models', () => ({
  Match: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
}));

function makeMockMatch(overrides = {}) {
  return {
    id: 1,
    tournamentId: 1,
    status: MATCH_STATUS.FINISHED,
    winnerId: 2,
    nextMatchId: 3,
    nextMatchSlot: 'PLAYER1',
    stageName: 'Quarterfinal 1',
    bracketPosition: 1,
    player1Id: 1,
    player2Id: 2,
    weightClass: '60-65kg',
    save: jest.fn(),
    ...overrides,
  };
}

describe('BracketService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('progressWinner', () => {
    it('advances winner to PLAYER1 slot', async () => {
      const match = makeMockMatch({ nextMatchSlot: 'PLAYER1' });
      const nextMatch = makeMockMatch({ id: 3, player1Id: null, player2Id: 4, save: jest.fn() });
      Match.findByPk.mockResolvedValueOnce(match).mockResolvedValueOnce(nextMatch);

      const result = await progressWinner(1);

      expect(nextMatch.player1Id).toBe(2);
      expect(nextMatch.save).toHaveBeenCalled();
      expect(result).toEqual({ nextMatchId: 3, slot: 'PLAYER1', winnerId: 2 });
    });

    it('advances winner to PLAYER2 slot', async () => {
      const match = makeMockMatch({ nextMatchSlot: 'PLAYER2' });
      const nextMatch = makeMockMatch({ id: 3, player1Id: 1, player2Id: null, save: jest.fn() });
      Match.findByPk.mockResolvedValueOnce(match).mockResolvedValueOnce(nextMatch);

      const result = await progressWinner(1);

      expect(nextMatch.player2Id).toBe(2);
      expect(nextMatch.save).toHaveBeenCalled();
      expect(result).toEqual({ nextMatchId: 3, slot: 'PLAYER2', winnerId: 2 });
    });

    it('does nothing for Final match (no nextMatchId)', async () => {
      const match = makeMockMatch({ nextMatchId: null });
      Match.findByPk.mockResolvedValueOnce(match);

      const result = await progressWinner(1);

      expect(result).toBeNull();
    });

    it('handles bye match progression', async () => {
      const match = makeMockMatch({ winnerId: 1, nextMatchSlot: 'PLAYER1' });
      const nextMatch = makeMockMatch({ id: 3, player1Id: null, player2Id: null, save: jest.fn() });
      Match.findByPk.mockResolvedValueOnce(match).mockResolvedValueOnce(nextMatch);

      const result = await progressWinner(1);

      expect(nextMatch.player1Id).toBe(1);
      expect(result).not.toBeNull();
    });

    it('returns null when nextMatchId is null (no progression)', async () => {
      const match = makeMockMatch({ nextMatchId: null });
      Match.findByPk.mockResolvedValueOnce(match);

      const result = await progressWinner(1);

      expect(result).toBeNull();
    });
  });

  describe('buildTreeFromMatches', () => {
    it('builds tree for 4-player bracket (2 QF -> 1 Final)', () => {
      const finalMatch = makeMockMatch({
        id: 3, stageName: 'Final', bracketPosition: 3, nextMatchId: null, player1Id: null, player2Id: null, winnerId: null,
      });
      const qf1 = makeMockMatch({
        id: 1, stageName: 'Quarterfinal 1', bracketPosition: 1, nextMatchId: 3, nextMatchSlot: 'PLAYER1', winnerId: 1,
      });
      const qf2 = makeMockMatch({
        id: 2, stageName: 'Quarterfinal 2', bracketPosition: 2, nextMatchId: 3, nextMatchSlot: 'PLAYER2', winnerId: 2,
      });

      const tree = buildTreeFromMatches([qf1, qf2, finalMatch]);

      expect(tree).not.toBeNull();
      expect(tree.id).toBe(3);
      expect(tree.player1Source).not.toBeNull();
      expect(tree.player1Source.id).toBe(1);
      expect(tree.player2Source).not.toBeNull();
      expect(tree.player2Source.id).toBe(2);
    });

    it('returns null for empty matches array', () => {
      expect(buildTreeFromMatches([])).toBeNull();
    });

    it('handles single Final match (no feeders)', () => {
      const finalMatch = makeMockMatch({
        id: 1, stageName: 'Final', bracketPosition: 1, nextMatchId: null,
        player1: { id: 1, name: 'Player A' },
        player2: { id: 2, name: 'Player B' },
      });

      const tree = buildTreeFromMatches([finalMatch]);

      expect(tree).not.toBeNull();
      expect(tree.id).toBe(1);
      expect(tree.player1).toEqual({ id: 1, name: 'Player A' });
      expect(tree.player2).toEqual({ id: 2, name: 'Player B' });
      expect(tree.player1Source).toBeUndefined();
      expect(tree.player2Source).toBeUndefined();
    });
  });

  describe('determineCurrentStage', () => {
    it('returns deepest stage with active match', () => {
      const matches = [
        makeMockMatch({ id: 1, stageName: 'Quarterfinal', status: MATCH_STATUS.FINISHED }),
        makeMockMatch({ id: 2, stageName: 'Quarterfinal', status: MATCH_STATUS.FINISHED }),
        makeMockMatch({ id: 3, stageName: 'Semifinal', status: MATCH_STATUS.SCHEDULED }),
        makeMockMatch({ id: 4, stageName: 'Final', status: MATCH_STATUS.SCHEDULED }),
      ];

      const stage = determineCurrentStage(matches);
      expect(stage).toBe('Final');
    });

    it('returns null for all finished matches (tournament complete)', () => {
      const matches = [
        makeMockMatch({ id: 1, stageName: 'Quarterfinal', status: MATCH_STATUS.FINISHED }),
        makeMockMatch({ id: 2, stageName: 'Semifinal', status: MATCH_STATUS.FINISHED }),
        makeMockMatch({ id: 3, stageName: 'Final', status: MATCH_STATUS.FINISHED }),
      ];

      const stage = determineCurrentStage(matches);
      expect(stage).toBeNull();
    });

    it('returns null for empty matches', () => {
      expect(determineCurrentStage([])).toBeNull();
    });

    it('identifies IN_PROGRESS stage correctly', () => {
      const matches = [
        makeMockMatch({ id: 1, stageName: 'Quarterfinal', status: MATCH_STATUS.FINISHED }),
        makeMockMatch({ id: 2, stageName: 'Quarterfinal', status: MATCH_STATUS.FINISHED }),
        makeMockMatch({ id: 3, stageName: 'Semifinal', status: MATCH_STATUS.IN_PROGRESS }),
        makeMockMatch({ id: 4, stageName: 'Final', status: MATCH_STATUS.SCHEDULED }),
      ];

      const stage = determineCurrentStage(matches);
      expect(stage).toBe('Final');
    });
  });

  describe('overrideNextMatchSlot', () => {
    it('overrides player1 slot', async () => {
      const match = makeMockMatch({ status: MATCH_STATUS.SCHEDULED, nextMatchSlot: 'PLAYER1' });
      const nextMatch = makeMockMatch({ id: 3, status: MATCH_STATUS.SCHEDULED, player1Id: null, player2Id: 4, save: jest.fn() });
      Match.findByPk.mockResolvedValueOnce(match).mockResolvedValueOnce(nextMatch);

      const result = await overrideNextMatchSlot(1, 99);

      expect(nextMatch.player1Id).toBe(99);
      expect(result).toEqual({ nextMatchId: 3, slot: 'PLAYER1', playerId: 99 });
    });

    it('throws when target match is already finished', async () => {
      const match = makeMockMatch({ status: MATCH_STATUS.FINISHED });
      Match.findByPk.mockResolvedValueOnce(match);

      await expect(overrideNextMatchSlot(1, 99)).rejects.toThrow('already finished');
    });
  });
});
