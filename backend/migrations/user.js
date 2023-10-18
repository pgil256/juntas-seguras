/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable("users", function (table) {
      table.increments("id").primary();
      table.string("first_name", 50).notNullable();
      table.string("last_name", 50).notNullable();
      table.string("email", 100).notNullable().check("position('@' IN email) > 1");
      table.integer("team").references("id").inTable("teams").onDelete("CASCADE");
      table.boolean("payed_up").notNullable().defaultTo(false);
      table.boolean("is_admin").notNullable().defaultTo(false);
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function (knex) {
    return knex.schema.dropTable("users");
  };
  