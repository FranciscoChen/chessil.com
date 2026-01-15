-- Switch to single rating/deviation/volatility columns
ALTER TABLE users ADD COLUMN rating numeric NOT NULL DEFAULT 1500;
ALTER TABLE users ADD COLUMN deviation numeric NOT NULL DEFAULT 350;
ALTER TABLE users ADD COLUMN volatility numeric NOT NULL DEFAULT 0.06;

-- Migrate existing ratings (using blitz as baseline)
UPDATE users
SET rating = blitz_rating,
    deviation = blitz_deviation,
    volatility = blitz_volatility;

-- Remove time-control specific columns
ALTER TABLE users
  DROP COLUMN ultrabullet_rating,
  DROP COLUMN bullet_rating,
  DROP COLUMN blitz_rating,
  DROP COLUMN rapid_rating,
  DROP COLUMN classical_rating,
  DROP COLUMN ultrabullet_deviation,
  DROP COLUMN bullet_deviation,
  DROP COLUMN blitz_deviation,
  DROP COLUMN rapid_deviation,
  DROP COLUMN classical_deviation,
  DROP COLUMN ultrabullet_volatility,
  DROP COLUMN bullet_volatility,
  DROP COLUMN blitz_volatility,
  DROP COLUMN rapid_volatility,
  DROP COLUMN classical_volatility;

-- Bot engine strength override
ALTER TABLE users ADD COLUMN uci_elo numeric;
