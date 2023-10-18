const db = require("../db");
const {
  NotFoundError,
  BadRequestError,
} = require("../expressError");

class Team {
  // CRUD operations for Team

  static async create({ name, pay_period, payment_amount }) {
    const team = await db.query(
      `INSERT INTO teams
       (name, pay_period, payment_amount)
       VALUES ($1, $2, $3)
       RETURNING
         id,
         name,
         pay_period,
         payment_amount`,
      [name, pay_period, payment_amount]
    ).then((res) => res.rows[0]);

    return team;
  }

  static async findAll() {
    const teams = await db.query(
      `SELECT id,
              name,
              pay_period,
              payment_amount
       FROM teams`
    ).then((res) => res.rows);

    return teams;
  }

  static async get(id) {
    const team = await db.query(
      `SELECT id,
              name,
              pay_period,
              payment_amount
       FROM teams
       WHERE id = $1`,
      [id]
    ).then((res) => res.rows[0]);

    if (!team) throw new NotFoundError(`No team with id: ${id}`);

    return team;
  }

  static async update(id, { name, pay_period, payment_amount }) {
    const team = await db.query(
      `UPDATE teams
       SET name = $1, pay_period = $2, payment_amount = $3
       WHERE id = $4
       RETURNING
         id,
         name,
         pay_period,
         payment_amount`,
      [name, pay_period, payment_amount, id]
    ).then((res) => res.rows[0]);

    if (!team) throw new NotFoundError(`Team not found with id: ${id}`);

    return team;
  }

  static async remove(id) {
    const result = await db.query(
      `DELETE FROM teams
       WHERE id = $1
       RETURNING id`,
      [id]
    ).then((res) => res.rows[0]);

    if (!result) throw new NotFoundError(`No team with id: ${id}`);
  }
}

module.exports = Team;
