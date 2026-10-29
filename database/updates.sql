ALTER TABLE users ADD COLUMN role integer NOT NULL DEFAULT 1;
CREATE TABLE roles (
    id integer PRIMARY KEY,
    name text NOT NULL UNIQUE
);
INSERT INTO roles (id, name) VALUES
    (1, 'user'),
    (2, 'admin'),
    (3, 'bot');
ALTER TABLE games
    ADD COLUMN initialtime numeric,
    ADD COLUMN increment numeric,
    ADD COLUMN rating1 numeric,
    ADD COLUMN rating2 numeric,
    ADD COLUMN ratingdiff1 numeric,
    ADD COLUMN ratingdiff2 numeric,
    ADD COLUMN clock1 numeric,
    ADD COLUMN clock2 numeric;
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
