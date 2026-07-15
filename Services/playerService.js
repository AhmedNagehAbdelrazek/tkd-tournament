const { Player, Club, Tournament, Match } = require('../Models');
const { ApiErrors } = require('../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { logAudit, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require('../Services/auditService');
const { Op } = require('sequelize');

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

function shapePlayer(p) {
  return {
    id: p.id,
    name: p.name,
    dob: p.dob,
    age: calculateAge(p.dob),
    yearOfBirth: yearOfBirth(p.dob),
    weight: parseFloat(p.weight),
    gender: p.gender,
    clubId: p.clubId,
    clubName: p.Club?.name || null,
    tournamentId: p.tournamentId,
    photoUrl: p.photoUrl,
    seed: p.seed,
  };
}

async function getById(id) {
  const player = await Player.findByPk(id, {
    include: [{ model: Club, attributes: ['name'] }],
  });
  if (!player) {
    throw ApiErrors.notFound('Player not found');
  }
  return shapePlayer(player);
}

async function create(data, actorId) {
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

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.CREATE,
      entityType: AUDIT_ENTITY_TYPES.PLAYER,
      entityId: player.id,
      metadata: { name: player.name, tournamentId: data.tournamentId },
    });
  }

  return shapePlayer({ ...player, Club: club });
}

async function update(id, data, actorId) {
  const player = await Player.findByPk(id);
  if (!player) {
    throw ApiErrors.notFound('Player not found');
  }

  const tournament = await Tournament.findByPk(player.tournamentId);
  if (tournament.isCompleted) {
    throw ApiErrors.badRequest('Cannot update player for a completed tournament');
  }

  if (data.clubId) {
    const club = await Club.findByPk(data.clubId);
    if (!club) {
      throw ApiErrors.notFound('Club not found');
    }
  }

  const weight = data.weight || parseFloat(player.weight);
  const gender = data.gender || player.gender;
  if (data.weight || data.gender) {
    validateWeight(tournament, weight, gender);
  }

  const previousValues = {};
  const changedFields = [];
  for (const field of ['name', 'dob', 'weight', 'gender', 'clubId', 'seed', 'photoUrl']) {
    if (data[field] !== undefined && data[field] !== player[field]) {
      previousValues[field] = player[field];
      changedFields.push(field);
    }
  }

  if (changedFields.length === 0) {
    return shapePlayer(player);
  }

  await player.update(data);

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: AUDIT_ENTITY_TYPES.PLAYER,
      entityId: player.id,
      metadata: { changedFields, previousValues, newValues: data },
    });
  }

  const updated = await Player.findByPk(id, {
    include: [{ model: Club, attributes: ['name'] }],
  });
  return shapePlayer(updated);
}

async function remove(id, actorId) {
  const player = await Player.findByPk(id);
  if (!player) {
    throw ApiErrors.notFound('Player not found');
  }

  const activeMatch = await Match.findOne({
    where: {
      [Op.or]: [{ player1Id: id }, { player2Id: id }],
      status: { [Op.in]: ['SCHEDULED', 'IN_PROGRESS'] },
    },
  });

  if (activeMatch) {
    throw ApiErrors.conflict('Cannot delete player with active matches (SCHEDULED or IN_PROGRESS)');
  }

  const playerName = player.name;
  const tournamentId = player.tournamentId;
  await player.destroy();

  if (actorId) {
    logAudit({
      actorId,
      action: AUDIT_ACTIONS.DELETE,
      entityType: AUDIT_ENTITY_TYPES.PLAYER,
      entityId: id,
      metadata: { name: playerName, tournamentId },
    });
  }

  return { message: 'Player deleted successfully' };
}

async function list(query = {}) {
  const { page, limit, offset } = parsePagination(query);
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
        where.weight = { [Op.between]: [wc.min, wc.max] };
      }
    }
  }

  const { rows, count } = await Player.findAndCountAll({
    where,
    include: [{ model: Club, attributes: ['name'] }],
    order: [['name', 'ASC']],
    limit,
    offset,
  });

  const meta = buildPaginationMeta(count, page, limit);
  return { data: rows.map(shapePlayer), meta };
}

async function bulkCreate(data, actorId) {
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
      const player = await Player.create({
        name: p.name,
        dob: p.dob,
        weight: p.weight,
        gender: p.gender,
        clubId: p.clubId,
        tournamentId: data.tournamentId,
      });
      results.created++;
      if (actorId) {
        logAudit({
          actorId,
          action: AUDIT_ACTIONS.CREATE,
          entityType: AUDIT_ENTITY_TYPES.PLAYER,
          entityId: player.id,
          metadata: { name: player.name, tournamentId: data.tournamentId },
        });
      }
    } catch (err) {
      results.errors.push({ index: i, reason: err.message || 'Validation failed' });
    }
  }

  return results;
}

module.exports = { create, bulkCreate, list, getById, update, remove, calculateAge, yearOfBirth, validateWeight };
