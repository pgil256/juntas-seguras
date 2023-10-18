/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable("teams", function (table) {
      table.increments("id").primary();
      table.string("name", 100).notNullable();
      table.integer("pay_period").notNullable();
      table.decimal("payment_amount", 10, 2).notNullable();
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function (knex) {
    return knex.schema.dropTable("teams");
  };
  