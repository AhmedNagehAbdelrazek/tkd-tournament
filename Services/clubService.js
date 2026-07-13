const { Club, Player } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');

async function create(data) {
  const existing = await Club.findOne({ where: { name: data.name } });
  if (existing) {
    throw ApiErrors.conflict('Club with this name already exists');
  }
  return Club.create({ name: data.name });
}

async function list() {
  const clubs = await Club.findAll({
    attributes: {
      include: [
        [
          require('sequelize').literal('(SELECT COUNT(*) FROM players WHERE players.club_id = "Club".id)'),
          'playerCount',
        ],
      ],
    },
    order: [['name', 'ASC']],
  });
  return { clubs };
}

module.exports = { create, list };
