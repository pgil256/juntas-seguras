"use strict";

require("dotenv").config();

const SECRET_KEY = process.env.SECRET_KEY || "secret-dev";

let HOST, PORT;

if (process.env.NODE_ENV === "production") {
  // For production, use the provided host and port or default to 8080
  HOST = process.env.HOST || '0.0.0.0';
  PORT = +process.env.PORT || 8080;
} else {
  // For development, use localhost and port 3000
  HOST = 'localhost';
  PORT = 3000;
}

// Automates URI to correct db URI based on whether in testing env or not
function getDatabaseUri() {
  console.log(process.env.NODE_ENV);
  console.log(process.env.DATABASE_URL);
  return process.env.NODE_ENV === "test"
    ? "seating_test"
    : process.env.DATABASE_URL || "map-my-seat-db";
}

const BCRYPT_WORK_FACTOR = process.env.NODE_ENV === "test" ? 1 : 12;

module.exports = {
  SECRET_KEY,
  HOST,
  PORT,
  BCRYPT_WORK_FACTOR,
  getDatabaseUri,
  target: "node",
};
