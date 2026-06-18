// 管理员鉴权：校验 Authorization: Bearer <ADMIN_TOKEN>
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  if (token && token === process.env.ADMIN_TOKEN) return next();
  const err = new Error('未授权');
  err.status = 401;
  next(err);
}

module.exports = { requireAdmin };
