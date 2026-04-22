const authMiddleware = {
  requireAuth: (req, res, next) => {
    if (req.session && req.session.user) {
      next();
    } else {
      res.redirect('/login');
    }
  },

  requireGuest: (req, res, next) => {
    if (req.session && req.session.user) {
      res.redirect('/tracker');
    } else {
      next();
    }
  },

  setUser: (req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
  }
};

module.exports = authMiddleware;
