const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");

// Middleware to validate token and store user data in res.locals
function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      res.locals.user = jwt.verify(token, SECRET_KEY);
    }
  } catch (err) {
    console.error("Error in JWT authentication:", err);
  }
  return next();
}

// Middleware to check if the user is logged in
function isLoggedIn(req, res, next) {
  if (!res.locals.user) {
    return next(new UnauthorizedError("User is not logged in"));
  }
  return next();
}

// Middleware to restrict access to admin users only
function adminOnly(req, res, next) {
  const user = res.locals.user;
  if (!user || !user.isAdmin) {
    return next(new UnauthorizedError("Access restricted to admins only"));
  }
  return next();
}

// Middleware to allow either admin or the correct user
function adminOrCorrectUser(req, res, next) {
  const user = res.locals.user;
  const requestedUsername = req.params.username;

  if (!user) {
    return next(new UnauthorizedError("No authenticated user"));
  }

  if (!(user.isAdmin || user.username === requestedUsername)) {
    return next(new UnauthorizedError("User not authorized"));
  }

  return next();
}

module.exports = {
  authenticateJWT,
  isLoggedIn,
  adminOnly,
  adminOrCorrectUser,
};
