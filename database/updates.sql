ALTER TABLE users ADD COLUMN IF NOT EXISTS role integer NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS roles (
    id integer PRIMARY KEY,
    name text NOT NULL UNIQUE
);
INSERT INTO roles (id, name) VALUES
    (1, 'user'),
    (2, 'admin'),
    (3, 'bot') ON CONFLICT DO NOTHING;
ALTER TABLE games
    ADD COLUMN IF NOT EXISTS initialtime numeric,
    ADD COLUMN IF NOT EXISTS increment numeric,
    ADD COLUMN IF NOT EXISTS rating1 numeric,
    ADD COLUMN IF NOT EXISTS rating2 numeric,
    ADD COLUMN IF NOT EXISTS ratingdiff1 numeric,
    ADD COLUMN IF NOT EXISTS ratingdiff2 numeric,
    ADD COLUMN IF NOT EXISTS clock1 numeric,
    ADD COLUMN IF NOT EXISTS clock2 numeric;
-- Public automated warning summaries. Internal evidence stays in engine Redis.
CREATE TABLE IF NOT EXISTS fair_play_accounts (
    userid bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    warning smallint CHECK (warning BETWEEN 0 AND 100),
    status text NOT NULL CHECK (status IN ('insufficient-data', 'no-flag', 'watch', 'flagged')),
    flagged_games integer NOT NULL CHECK (flagged_games >= 0),
    analysed_games integer NOT NULL CHECK (analysed_games >= flagged_games),
    observed_games integer NOT NULL CHECK (observed_games >= analysed_games),
    flagged_rate numeric(5,2) CHECK (flagged_rate BETWEEN 0 AND 100),
    compared_moves integer NOT NULL CHECK (compared_moves >= 0),
    loss_samples integer NOT NULL CHECK (loss_samples >= 0),
    opponents integer NOT NULL CHECK (opponents >= 0),
    revision bigint NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Apply before enabling multiple regions. No fixed column per game server.
CREATE TABLE IF NOT EXISTS game_server_latency (
  sessionid text NOT NULL,
  server text NOT NULL CHECK (server ~ '^ws[0-9]+$'),
  rtt double precision NOT NULL CHECK (rtt >= 0 AND rtt <= 30000),
  measured_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (sessionid, server)
);
CREATE INDEX IF NOT EXISTS game_server_latency_measured_at ON game_server_latency (measured_at);

CREATE TABLE IF NOT EXISTS game_start_jobs (
  gameid text PRIMARY KEY REFERENCES games(gameid) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  next_attempt timestamptz NOT NULL DEFAULT NOW(),
  lease_until timestamptz
);

ALTER TABLE games ADD COLUMN IF NOT EXISTS bot_program text;
ALTER TABLE games ADD COLUMN IF NOT EXISTS bot_version smallint;
ALTER TABLE games ADD COLUMN IF NOT EXISTS bot_difficulty smallint CHECK (bot_difficulty BETWEEN 1 AND 8);
ALTER TABLE games ADD COLUMN IF NOT EXISTS bot_side text CHECK (bot_side IN ('w','b'));
