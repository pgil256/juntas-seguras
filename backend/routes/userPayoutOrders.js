"use strict";

const express = require("express");
const router = express.Router();
const { adminOnly } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const UserPayoutOrder = require("../models/userPayoutOrder");

const userPayoutOrderNewSchema = require("../schemas/userPayoutOrder/userPayoutOrderCreate.json");
const userPayoutOrderUpdateSchema = require("../schemas/userPayoutOrder/userPayoutOrderUpdate.json");

// Create a new user payout order
router.post("/", adminOnly, async (req, res, next) => {
  try {
    const { user_id, team_id, pay_out_order } = req.body;

    const userPayoutOrder = await UserPayoutOrder.create({
      user_id,
      team_id,
      pay_out_order,
    });

    return res.status(201).json({ userPayoutOrder });
  } catch (err) {
    return next(err);
  }
});

// Get all user payout orders
router.get("/", async (req, res, next) => {
  try {
    const userPayoutOrders = await UserPayoutOrder.findAll();
    return res.json({ userPayoutOrders });
  } catch (err) {
    return next(err);
  }
});

// Get an individual user payout order
router.get("/:user_id/:team_id", async (req, res, next) => {
  try {
    const { user_id, team_id } = req.params;
    const userPayoutOrder = await UserPayoutOrder.get(user_id, team_id);
    return res.json({ userPayoutOrder });
  } catch (err) {
    return next(err);
  }
});

// Update an individual user payout order
router.patch("/:user_id/:team_id", adminOnly, async (req, res, next) => {
  try {
    const { user_id, team_id } = req.params;
    const updates = req.body;

    const userPayoutOrder = await UserPayoutOrder.update(user_id, team_id, updates);
    return res.json({ userPayoutOrder });
  } catch (err) {
    return next(err);
  }
});

// Delete a particular user payout order
router.delete("/:user_id/:team_id", adminOnly, async (req, res, next) => {
  try {
    const { user_id, team_id } = req.params;

    await UserPayoutOrder.remove(user_id, team_id);
    return res.json({ deleted: { user_id, team_id } });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
