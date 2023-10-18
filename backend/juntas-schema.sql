CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL CHECK (position('@' IN email) > 1),
  team INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  payed_up BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  pay_period INTEGER NOT NULL,
  payment_amount DECIMAL(10, 2) NOT NULL
);

CREATE TABLE user_payout_order (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  pay_out_order JSON,
  PRIMARY KEY (user_id, team_id)
);
