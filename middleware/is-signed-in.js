const isSignedIn = (req, res, next) => {
  if (req.session.user) return next();
  res.redirect("/auth/log-in");
};

module.exports = isSignedIn;
