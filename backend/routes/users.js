"use strict";

const express = require("express");
const router = express.Router();
const { adminOrCorrectUser, adminOnly } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const User = require("../models/user");
const {
  createToken,
  authenticateToken, // Import this function for authentication
} = require("../helpers/tokens");

const userNewSchema = require("../schemas/user/userCreate.json");
const userUpdateSchema = require("../schemas/user/userUpdate.json");

// Create a new user (admin only)
router.post("/", adminOnly, async (req, res, next) => {
  try {
    const { email, password, title, firstName, lastName, isAdmin } = req.body;

    const user = await User.register({
      email,
      password,
      title,
      firstName,
      lastName,
      isAdmin,
    });

    const token = createToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
});

// Get all users (admin only)
router.get("/", adminOnly, async (req, res, next) => {
  try {
    const users = await User.findAll();
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});

// Get an individual user (admin/correct user only)
router.get("/:id", adminOrCorrectUser, async (req, res, next) => {
  try {
    const user = await User.get(req.params.id);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

// Update an individual user (admin/correct user only)
router.patch("/:id", adminOrCorrectUser, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await User.update(id, updates);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

// Delete a particular user (admin/correct user only)
router.delete("/:id", adminOrCorrectUser, async (req, res, next) => {
  try {
    const { id } = req.params;

    await User.remove(id);
    return res.json({ deleted: id });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
