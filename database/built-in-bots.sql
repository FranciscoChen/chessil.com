ALTER TABLE games ADD COLUMN IF NOT EXISTS bot_program text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS bot_version smallint;
ALTER TABLE games ADD COLUMN IF NOT EXISTS bot_difficulty smallint CHECK (bot_difficulty BETWEEN 1 AND 8);
ALTER TABLE games ADD COLUMN IF NOT EXISTS bot_side text CHECK (bot_side IN ('w','b'));
