"use strict";

const express = require("express");
const cors = require("cors");
const { authenticateJWT } = require("./middleware/auth");
const { NotFoundError } = require("./expressError");
const teamsRoutes = require("./routes/teams");
const usersRoutes = require("./routes/users");
const userPayoutOrdersRoutes = require("./routes/userPayoutOrders");
const path = require("path");
const morgan = require("morgan");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));
app.use(authenticateJWT);
app.set("etag", false);

// Point to the frontend's built directory
const FRONTEND_DIST_DIR = path.join(__dirname, '..', 'frontend', 'dist');

// Serve static files from the dist directory of frontend
app.use(express.static(FRONTEND_DIST_DIR));

// Routes
app.use("/teams", teamsRoutes); // Teams routes
app.use("/users", usersRoutes); // Users routes
app.use("/user-payout-orders", userPayoutOrdersRoutes); // UserPayoutOrders routes

// Serve the index.html file for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST_DIR, "index.html"));
});

// Welcome route
app.get("/", (req, res) => {
  res.send("Welcome to the homepage!");
});

// 404 Error handler
app.use((req, res, next) => {
  return next(new NotFoundError());
});

// Generic error handler
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== "test") console.error(err.stack);
  const status = err.status || 500;
  const message = err.message;

  return res.status(status).json({
    error: { message, status },
  });
});

module.exports = app;
