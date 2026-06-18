// 统一错误处理：控制器抛出的错误带 .status 时使用，否则 500
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || '服务器内部错误' });
}

module.exports = errorHandler;
