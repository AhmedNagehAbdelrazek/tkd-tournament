const authService = require('../Services/authService');
const { successResponse } = require('../utils/httpResponse');
const { signupValidation, loginValidation, updateProfileValidation } = require('../utils/validators/authValidator');
const validate = require('../middlewares/validatorMiddleware');

const signup = [
  ...signupValidation,
  validate,
  async (req, res, next) => {
    try {
      const result = await authService.signup(req.body);
      successResponse(res, result, 201);
    } catch (err) {
      next(err);
    }
  },
];

const login = [
  ...loginValidation,
  validate,
  async (req, res, next) => {
    try {
      const result = await authService.login(req.body);
      successResponse(res, result);
    } catch (err) {
      next(err);
    }
  },
];

const me = async (req, res, next) => {
  try {
    const user = await authService.me(req.user);
    successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

const updateProfile = [
  ...updateProfileValidation,
  validate,
  async (req, res, next) => {
    try {
      const user = await authService.updateProfile(req.user.id, req.body);
      successResponse(res, user);
    } catch (err) {
      next(err);
    }
  },
];

module.exports = { signup, login, me, updateProfile };
