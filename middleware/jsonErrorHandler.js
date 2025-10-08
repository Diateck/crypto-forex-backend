// Central JSON error handler middleware
// Ensures all errors are returned as JSON and honors `retryAfterSeconds` when present
module.exports = function jsonErrorHandler(err, req, res, next) {
  try {
    // Log stack trace on server
    if (err && err.stack) console.error(err.stack);
  } catch (logErr) {
    console.error('Error while logging error:', logErr);
  }

  const status = (err && err.status) ? err.status : 500;

  // If the error includes retryAfterSeconds, set Retry-After header (in seconds)
  if (status === 429) {
    const ra = (err && (err.retryAfterSeconds || err.retryAfter)) || null;
    if (ra) {
      // Ensure header is a string of seconds
      res.set('Retry-After', String(Math.ceil(Number(ra) || 0)));
    }
  }

  // Build safe JSON body
  const body = {
    success: false,
    message: (err && (err.message || err.error)) || 'Internal Server Error'
  };

  // Expose stack only in development for diagnostics
  if (process.env.NODE_ENV === 'development' && err && err.stack) {
    body.stack = err.stack;
  }

  // Ensure we always send JSON
  res.status(status).json(body);
};
