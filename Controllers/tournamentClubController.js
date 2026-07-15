const tcService = require('../Services/tournamentClubService');
const { successResponse } = require('../utils/httpResponse');

const registerClub = async (req, res, next) => {
  try {
    const result = await tcService.registerClub(req.params.id, req.body.clubId, req.user?.id);
    successResponse(res, result, 201);
  } catch (err) { next(err); }
};

const deregisterClub = async (req, res, next) => {
  try {
    const result = await tcService.deregisterClub(req.params.id, req.params.clubId, req.user?.id);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const listClubs = async (req, res, next) => {
  try {
    const clubs = await tcService.listClubs(req.params.id);
    successResponse(res, clubs);
  } catch (err) { next(err); }
};

const listTournaments = async (req, res, next) => {
  try {
    const tournaments = await tcService.listTournaments(req.params.id);
    successResponse(res, tournaments);
  } catch (err) { next(err); }
};

module.exports = { registerClub, deregisterClub, listClubs, listTournaments };
