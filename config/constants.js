const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CUSTOMER: 'customer',
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
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAGINATION,
  ADMIN_RESOURCES,
  ADMIN_ACTIONS,
};
