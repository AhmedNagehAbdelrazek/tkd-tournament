const { Category, Match, Player, Club, Tournament } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const { successResponse } = require('../utils/httpResponse');

function shapeMatch(m) {
  return {
    id: String(m.id),
    round: m.bracketRound || 1,
    player1: m.player1 ? { id: String(m.player1.id), name: m.player1.name, clubName: m.player1.Club?.name || null } : null,
    player2: m.player2 ? { id: String(m.player2.id), name: m.player2.name, clubName: m.player2.Club?.name || null } : null,
    winner: m.winner ? { id: String(m.winner.id), name: m.winner.name } : null,
    nextMatchId: m.nextMatchId ? String(m.nextMatchId) : null,
  };
}

const getById = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.categoryId, {
      include: [{ model: Tournament, attributes: ['id', 'name'], required: false }],
    });
    if (!category) {
      throw ApiErrors.notFound('Category not found');
    }

    const matches = await Match.findAll({
      where: { categoryId: category.id },
      include: [
        { model: Player, as: 'player1', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
        { model: Player, as: 'player2', attributes: ['id', 'name'], include: [{ model: Club, attributes: ['name'] }] },
        { model: Player, as: 'winner', attributes: ['id', 'name'], required: false },
      ],
      order: [['bracketPosition', 'ASC']],
    });

    successResponse(res, {
      id: String(category.id),
      name: category.name,
      bracketDepth: category.bracketDepth,
      matches: matches.map(shapeMatch),
    });
  } catch (err) { next(err); }
};

module.exports = { getById };
