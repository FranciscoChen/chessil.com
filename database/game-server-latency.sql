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
