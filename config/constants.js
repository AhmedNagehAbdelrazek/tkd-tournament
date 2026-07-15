const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CUSTOMER: 'customer',
};

const TKD_ROLES = {
  ADMIN: 'ADMIN',
  HEAD_JUDGE: 'HEAD_JUDGE',
  MAT_JUDGE: 'MAT_JUDGE',
  SCOREKEEPER: 'SCOREKEEPER',
};

const MATCH_STATUS = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  PAUSED: 'PAUSED',
  FINISHED: 'FINISHED',
  CANCELLED: 'CANCELLED',
};

const MATCH_EVENT_TYPES = {
  START: 'START',
  PAUSE: 'PAUSE',
  RESUME: 'RESUME',
  END_ROUND: 'END_ROUND',
  ADD_POINT: 'ADD_POINT',
  REMOVE_POINT: 'REMOVE_POINT',
  AUTO_END_BY_GAP: 'AUTO_END_BY_GAP',
  CANCEL: 'CANCEL',
  FINISHED: 'FINISHED',
};

const MATCH_TYPES = {
  SINGLE_ELIMINATION: 'SINGLE_ELIMINATION',
  ROUND_ROBIN: 'ROUND_ROBIN',
  FRIENDLY: 'FRIENDLY',
};

const END_REASONS = {
  TIME_EXPIRED: 'TIME_EXPIRED',
  POINT_GAP: 'POINT_GAP',
  WALKOVER: 'WALKOVER',
  INJURY_WITHDRAWAL: 'INJURY_WITHDRAWAL',
  DISQUALIFICATION: 'DISQUALIFICATION',
  REFEREE_STOPPAGE: 'REFEREE_STOPPAGE',
  GOLDEN_POINT: 'GOLDEN_POINT',
  BYE: 'BYE',
};

const GENDERS = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
};

const SIGNUP_ROLES = [ROLES.CUSTOMER];

const ADMIN_RESOURCES = [
  'products',
  'orders',
  'coupons',
  'brands',
  'suppliers',
  'reviews',
  'expenses',
  'content',
  'settings',
  'shipping',
  'finance',
  'dashboard',
  'audit-logs',
  'admins',
  'product-sections',
];

const ADMIN_ACTIONS = ['create', 'read', 'update', 'delete'];

const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
};

const PAYMENT_METHODS = {
  COD: 'cod',
  INSTAPAY: 'instapay',
  VODAFONE_CASH: 'vodafone_cash',
};

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

module.exports = {
  ROLES,
  TKD_ROLES,
  MATCH_STATUS,
  MATCH_EVENT_TYPES,
  MATCH_TYPES,
  END_REASONS,
  GENDERS,
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAGINATION,
  ADMIN_RESOURCES,
  ADMIN_ACTIONS,
};
