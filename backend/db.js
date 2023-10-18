"use strict";
require("dotenv").config();
const { Client } = require("pg");
const knex = require('knex');
const knexfile = require('./knexfile');

// Determine the environment
const env = process.env.NODE_ENV || 'development';

let db;

if (env === "production") {
  // Use pg for production environment
  db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
} else {
  // Use knex for other environments
  const configOptions = knexfile[env];
  db = knex(configOptions);
}

// Connect to the database
if (env === "production") {
  db.connect();
}

module.exports = db;
