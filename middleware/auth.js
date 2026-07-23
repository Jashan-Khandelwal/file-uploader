// Gate for routes that require a logged-in user.
function isAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

module.exports = { isAuth };
