const { Category, Match, Player, Club, Tournament } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const { successResponse, paginatedResponse } = require('../utils/httpResponse');
const { parsePagination } = require('../utils/pagination');
const { Op } = require('sequelize');

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

const list = async (req, res, next) => {
  try {
    const { page, limit, offset, pageSize } = parsePagination(req.query);
    const where = {};

    if (req.query.tournamentId) {
      where.tournamentId = req.query.tournamentId;
    }
    if (req.query.gender) {
      where.gender = req.query.gender.toUpperCase();
    }
    if (req.query.search) {
      where.name = { [Op.iLike]: `%${req.query.search}%` };
    }

    const { rows, count } = await Category.findAndCountAll({
      where,
      include: [{ model: Tournament, attributes: ['id', 'name'], required: false }],
      order: [['tournamentId', 'ASC'], ['gender', 'ASC'], ['minWeight', 'ASC']],
      limit,
      offset,
    });

    const categories = rows.map((c) => ({
      id: String(c.id),
      name: c.name,
      gender: c.gender,
      minWeight: c.minWeight,
      maxWeight: c.maxWeight,
      bracketDepth: c.bracketDepth,
      tournament: c.Tournament ? { id: String(c.Tournament.id), name: c.Tournament.name } : null,
    }));

    paginatedResponse(res, categories, count, page, pageSize);
  } catch (err) { next(err); }
};

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
      name: `${category.name} - ${category.gender}`,
      bracketDepth: category.bracketDepth,
      matches: matches.map(shapeMatch),
    });
  } catch (err) { next(err); }
};

module.exports = { list, getById };
