const { PAGINATION } = require('../config/constants');

function parsePagination(query) {
  let page = parseInt(query.page, 10) || PAGINATION.DEFAULT_PAGE;
  let pageSize = parseInt(query.pageSize || query.limit, 10) || PAGINATION.DEFAULT_LIMIT;

  if (page < 1) page = PAGINATION.DEFAULT_PAGE;
  if (pageSize < 1) pageSize = PAGINATION.DEFAULT_LIMIT;
  if (pageSize > PAGINATION.MAX_LIMIT) pageSize = PAGINATION.MAX_LIMIT;

  const offset = (page - 1) * pageSize;

  return { page, limit: pageSize, offset, pageSize };
}

function buildPaginatedResponse(data, totalCount, page, pageSize) {
  return {
    data,
    totalCount,
    page,
    pageSize,
  };
}

module.exports = { parsePagination, buildPaginatedResponse };
