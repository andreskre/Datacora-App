function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function httpError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  if (details) error.details = details;
  return error;
}

function ok(res, body, status = 200) {
  res.status(status).json(body);
}

module.exports = { asyncHandler, httpError, ok };
