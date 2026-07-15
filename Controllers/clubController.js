const clubService = require('../Services/clubService');
const { successResponse, paginatedResponse } = require('../utils/httpResponse');

const create = async (req, res, next) => {
  try {
    const club = await clubService.create(req.body, req.user?.id);
    successResponse(res, club, 201);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const club = await clubService.getById(req.params.id);
    successResponse(res, club);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const club = await clubService.update(req.params.id, req.body, req.user?.id);
    successResponse(res, club);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const result = await clubService.remove(req.params.id, req.user?.id);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const { data, meta } = await clubService.list(req.query);
    paginatedResponse(res, data, meta);
  } catch (err) { next(err); }
};

module.exports = { create, getById, update, remove, list };
