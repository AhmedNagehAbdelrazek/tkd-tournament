const { Player, Club, Tournament } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');

function calculateAge(dob) {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function yearOfBirth(dob) {
  return new Date(dob).getFullYear();
}

function validateWeight(tournament, weight, gender) {
  const genderClasses = tournament.settings?.weightClasses?.[gender] || [];
  if (genderClasses.length === 0) {
    throw ApiErrors.validation(
      `No weight classes configured for ${gender} division`
    );
  }
  const match = genderClasses.find((wc) => weight >= wc.min && weight <= wc.max);
  if (!match) {
    const rangeList = genderClasses.map((wc) => wc.name).join(', ');
    throw ApiErrors.validation(
      `Weight ${weight}kg does not fall within any ${gender} weight class. Available ranges: ${rangeList}`
    );
  }
  return match;
}

async function create(data) {
  const tournament = await Tournament.findByPk(data.tournamentId);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }
  if (tournament.isCompleted) {
    throw ApiErrors.badRequest('Cannot register player for a completed tournament');
  }

  const club = await Club.findByPk(data.clubId);
  if (!club) {
    throw ApiErrors.notFound('Club not found');
  }

  validateWeight(tournament, data.weight, data.gender);

  const player = await Player.create({
    name: data.name,
    dob: data.dob,
    weight: data.weight,
    gender: data.gender,
    clubId: data.clubId,
    tournamentId: data.tournamentId,
    photoUrl: data.photoUrl || null,
  });

  const age = calculateAge(data.dob);

  return {
    id: player.id,
    name: player.name,
    dob: player.dob,
    age,
    yearOfBirth: yearOfBirth(player.dob),
    weight: parseFloat(player.weight),
    gender: player.gender,
    clubId: player.clubId,
    clubName: club.name,
    tournamentId: player.tournamentId,
    photoUrl: player.photoUrl,
  };
}

async function bulkCreate(data) {
  const tournament = await Tournament.findByPk(data.tournamentId);
  if (!tournament) {
    throw ApiErrors.notFound('Tournament not found');
  }

  const results = { created: 0, errors: [] };

  for (let i = 0; i < data.players.length; i++) {
    const p = data.players[i];
    try {
      validateWeight(tournament, p.weight, p.gender);
      const club = await Club.findByPk(p.clubId);
      if (!club) {
        results.errors.push({ index: i, reason: 'Club not found' });
        continue;
      }
      await Player.create({
        name: p.name,
        dob: p.dob,
        weight: p.weight,
        gender: p.gender,
        clubId: p.clubId,
        tournamentId: data.tournamentId,
      });
      results.created++;
    } catch (err) {
      results.errors.push({ index: i, reason: err.message || 'Validation failed' });
    }
  }

  return results;
}

async function list(query = {}) {
  const where = {};
  if (query.tournamentId) where.tournamentId = query.tournamentId;
  if (query.gender) where.gender = query.gender;
  if (query.clubId) where.clubId = query.clubId;
  if (query.weightClass && query.tournamentId) {
    const tournament = await Tournament.findByPk(query.tournamentId);
    if (tournament) {
      const genderClasses = tournament.settings?.weightClasses?.[query.gender] || [];
      const wc = genderClasses.find((c) => c.name === query.weightClass);
      if (wc) {
        where.weight = { [require('sequelize').Op.between]: [wc.min, wc.max] };
      }
    }
  }

  const players = await Player.findAll({
    where,
    include: [{ model: Club, attributes: ['name'] }],
    order: [['name', 'ASC']],
  });

  return {
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      age: calculateAge(p.dob),
      yearOfBirth: yearOfBirth(p.dob),
      weight: parseFloat(p.weight),
      gender: p.gender,
      clubId: p.clubId,
      clubName: p.Club?.name,
      photoUrl: p.photoUrl,
    })),
    total: players.length,
  };
}

module.exports = { create, bulkCreate, list, calculateAge, yearOfBirth, validateWeight };
