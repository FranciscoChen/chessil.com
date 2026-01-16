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
