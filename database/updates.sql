-- Switch to single rating/deviation/volatility columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating numeric NOT NULL DEFAULT 1500;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deviation numeric NOT NULL DEFAULT 350;
ALTER TABLE users ADD COLUMN IF NOT EXISTS volatility numeric NOT NULL DEFAULT 0.06;

-- Migrate existing ratings (using blitz as baseline)
UPDATE users
SET rating = blitz_rating,
    deviation = blitz_deviation,
    volatility = blitz_volatility;

-- Remove time-control specific columns
ALTER TABLE users
  DROP COLUMN IF EXISTS ultrabullet_rating,
  DROP COLUMN IF EXISTS bullet_rating,
  DROP COLUMN IF EXISTS blitz_rating,
  DROP COLUMN IF EXISTS rapid_rating,
  DROP COLUMN IF EXISTS classical_rating,
  DROP COLUMN IF EXISTS ultrabullet_deviation,
  DROP COLUMN IF EXISTS bullet_deviation,
  DROP COLUMN IF EXISTS blitz_deviation,
  DROP COLUMN IF EXISTS rapid_deviation,
  DROP COLUMN IF EXISTS classical_deviation,
  DROP COLUMN IF EXISTS ultrabullet_volatility,
  DROP COLUMN IF EXISTS bullet_volatility,
  DROP COLUMN IF EXISTS blitz_volatility,
  DROP COLUMN IF EXISTS rapid_volatility,
  DROP COLUMN IF EXISTS classical_volatility;

-- Bot engine strength override
ALTER TABLE users ADD COLUMN IF NOT EXISTS uci_elo numeric;
