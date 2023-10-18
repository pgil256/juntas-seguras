const db = require("../db");
const {
  NotFoundError,
  BadRequestError,
} = require("../expressError");

class UserPayoutOrder {
  // CRUD operations for UserPayoutOrder

  static async create({ user_id, team_id, pay_out_order }) {
    const userPayoutOrder = await db.query(
      `INSERT INTO user_payout_order
       (user_id, team_id, pay_out_order)
       VALUES ($1, $2, $3)
       RETURNING
         user_id,
         team_id,
         pay_out_order`,
      [user_id, team_id, pay_out_order]
    ).then((res) => res.rows[0]);

    return userPayoutOrder;
  }

  static async findAll() {
    const userPayoutOrders = await db.query(
      `SELECT user_id,
              team_id,
              pay_out_order
       FROM user_payout_order`
    ).then((res) => res.rows);

    return userPayoutOrders;
  }

  static async get(user_id, team_id) {
    const userPayoutOrder = await db.query(
      `SELECT user_id,
              team_id,
              pay_out_order
       FROM user_payout_order
       WHERE user_id = $1 AND team_id = $2`,
      [user_id, team_id]
    ).then((res) => res.rows[0]);

    if (!userPayoutOrder) throw new NotFoundError(`No payout order for user_id: ${user_id} and team_id: ${team_id}`);

    return userPayoutOrder;
  }

  static async update(user_id, team_id, { pay_out_order }) {
    const userPayoutOrder = await db.query(
      `UPDATE user_payout_order
       SET pay_out_order = $1
       WHERE user_id = $2 AND team_id = $3
       RETURNING
         user_id,
         team_id,
         pay_out_order`,
      [pay_out_order, user_id, team_id]
    ).then((res) => res.rows[0]);

    if (!userPayoutOrder) throw new NotFoundError(`Payout order not found for user_id: ${user_id} and team_id: ${team_id}`);

    return userPayoutOrder;
  }

  static async remove(user_id, team_id) {
    const result = await db.query(
      `DELETE FROM user_payout_order
       WHERE user_id = $1 AND team_id = $2
       RETURNING user_id`,
      [user_id, team_id]
    ).then((res) => res.rows[0]);

    if (!result) throw new NotFoundError(`No payout order for user_id: ${user_id} and team_id: ${team_id}`);
  }
}

module.exports = UserPayoutOrder;
