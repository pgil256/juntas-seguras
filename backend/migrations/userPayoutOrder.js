/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable("user_payout_order", function (table) {
      table.integer("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
      table.integer("team_id").notNullable().references("id").inTable("teams").onDelete("CASCADE");
      table.json("pay_out_order");
      table.primary(["user_id", "team_id"]);
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function (knex) {
    return knex.schema.dropTable("user_payout_order");
  };
  