function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json(data);
}

function paginatedResponse(res, data, totalCount, page, pageSize) {
  return res.status(200).json({
    data,
    totalCount,
    page,
    pageSize,
  });
}

module.exports = { successResponse, paginatedResponse };
