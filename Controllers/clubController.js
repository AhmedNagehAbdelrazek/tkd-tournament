const clubService = require('../Services/clubService');
const { successResponse } = require('../utils/httpResponse');

const create = async (req, res, next) => {
  try {
    const club = await clubService.create(req.body);
    successResponse(res, club, 201);
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const result = await clubService.list();
    successResponse(res, result);
  } catch (err) { next(err); }
};

module.exports = { create, list };
