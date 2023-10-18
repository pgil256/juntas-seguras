const db = require("../db");
const bcrypt = require("bcrypt");
const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require("../expressError");

const { BCRYPT_WORK_FACTOR } = require("../config.js");

class User {
  // CRUD operations for User

  static async authenticate(email, password) {
    const user = await db.query(
      `SELECT id,
              first_name,
              last_name,
              email,
              team,
              payed_up,
              is_admin,
              password
       FROM users
       WHERE email = $1`,
      [email]
    ).then((res) => res.rows[0]);

    if (user) {
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid === true) {
        delete user.password;
        return user;
      }
    }
    throw new UnauthorizedError("Invalid email and password combination");
  }

  static async register({ first_name, last_name, email, team, password }) {
    const duplicateCheck = await db.query(
      `SELECT email
       FROM users
       WHERE email = $1`,
      [email]
    ).then((res) => res.rows[0]);

    if (duplicateCheck) {
      throw new BadRequestError(`Duplicate email: ${email}`);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const user = await db.query(
      `INSERT INTO users
       (first_name, last_name, email, team, password)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING
         id,
         first_name,
         last_name,
         email,
         team,
         payed_up,
         is_admin`,
      [first_name, last_name, email, team, hashedPassword]
    ).then((res) => res.rows[0]);

    return user;
  }

  static async findAll() {
    const users = await db.query(
      `SELECT id,
              first_name,
              last_name,
              email,
              team,
              payed_up,
              is_admin
       FROM users`
    ).then((res) => res.rows);

    return users;
  }

  static async get(id) {
    const user = await db.query(
      `SELECT id,
              first_name,
              last_name,
              email,
              team,
              payed_up,
              is_admin
       FROM users
       WHERE id = $1`,
      [id]
    ).then((res) => res.rows[0]);

    if (!user) throw new NotFoundError(`No user with id: ${id}`);

    return user;
  }

  static async update(id, data) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
    }

    const { query, values } = sqlForPartialUpdate(
      "users",
      data,
      {
        first_name: "first_name",
        last_name: "last_name",
        payed_up: "payed_up",
        is_admin: "is_admin",
      },
      "id"
    );

    const user = await db.query(query, values).then((res) => res.rows[0]);

    if (!user) throw new NotFoundError(`User not found with id: ${id}`);

    return user;
  }

  static async remove(id) {
    const result = await db.query(
      `DELETE FROM users
       WHERE id = $1
       RETURNING id`,
      [id]
    ).then((res) => res.rows[0]);

    if (!result) throw new NotFoundError(`No user with id: ${id}`);
  }
}

module.exports = User;
