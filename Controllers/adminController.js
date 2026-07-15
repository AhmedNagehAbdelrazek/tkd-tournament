const adminService = require('../Services/adminService');
const { successResponse, paginatedResponse } = require('../utils/httpResponse');

const listUsers = async (req, res, next) => {
  try {
    const { data, meta } = await adminService.listUsers(req.query);
    paginatedResponse(res, data, meta);
  } catch (err) { next(err); }
};

const assignRole = async (req, res, next) => {
  try {
    const result = await adminService.assignRole(req.params.id, req.body.tkdRole, req.user?.id);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const deactivateUser = async (req, res, next) => {
  try {
    const result = await adminService.deactivateUser(req.params.id, req.user?.id);
    successResponse(res, result);
  } catch (err) { next(err); }
};

const reactivateUser = async (req, res, next) => {
  try {
    const result = await adminService.reactivateUser(req.params.id, req.user?.id);
    successResponse(res, result);
  } catch (err) { next(err); }
};

module.exports = { listUsers, assignRole, deactivateUser, reactivateUser };
