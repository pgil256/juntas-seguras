"use strict";

const express = require("express");
const router = express.Router();
const { adminOnly } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const Team = require("../models/team");

const teamNewSchema = require("../schemas/team/teamCreate.json");
const teamUpdateSchema = require("../schemas/team/teamUpdate.json");

// Create a new team (admin only)
router.post("/", adminOnly, async (req, res, next) => {
  try {
    const { name, pay_period, payment_amount } = req.body;

    const team = await Team.create({
      name,
      pay_period,
      payment_amount,
    });

    return res.status(201).json({ team });
  } catch (err) {
    return next(err);
  }
});

// Get all teams
router.get("/", async (req, res, next) => {
  try {
    const teams = await Team.findAll();
    return res.json({ teams });
  } catch (err) {
    return next(err);
  }
});

// Get an individual team
router.get("/:id", async (req, res, next) => {
  try {
    const team = await Team.get(req.params.id);
    return res.json({ team });
  } catch (err) {
    return next(err);
  }
});

// Update an individual team (admin only)
router.patch("/:id", adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const team = await Team.update(id, updates);
    return res.json({ team });
  } catch (err) {
    return next(err);
  }
});

// Delete a particular team (admin only)
router.delete("/:id", adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;

    await Team.remove(id);
    return res.json({ deleted: id });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
