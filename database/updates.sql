-- Switch to single rating/deviation/volatility columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating numeric NOT NULL DEFAULT 1500;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deviation numeric NOT NULL DEFAULT 350;
ALTER TABLE users ADD COLUMN IF NOT EXISTS volatility numeric NOT NULL DEFAULT 0.06;

-- Migrate existing ratings (using blitz as baseline)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'blitz_rating'
  ) THEN
    UPDATE users
    SET rating = blitz_rating,
        deviation = blitz_deviation,
        volatility = blitz_volatility;
  END IF;
END $$;

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
