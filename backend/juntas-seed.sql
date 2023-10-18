-- Inserting mock data into the users table
INSERT INTO users
  (first_name, last_name, email, team, payed_up)
VALUES
  ('John',
   'Doe',
   'john.doe@example.com',
   1,
   FALSE,
   FALSE),

  ('Jane',
   'Smith',
   'jane.smith@example.com',
   2,
   TRUE,
   FALSE);

-- Inserting mock data into the teams table
INSERT INTO teams (name, pay_period, payment_amount)
VALUES
  ('Team Alpha',
   30,
   100.50),

  ('Team Beta',
   15,
   75.25);

-- Inserting mock data into the user_payout_order table
INSERT INTO user_payout_order (user_id, team_id, pay_out_order)
VALUES
  (1, 1, 1),
  (2, 2, 1);
