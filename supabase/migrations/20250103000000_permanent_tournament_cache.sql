-- Add permanent cache table for completed tournaments
CREATE TABLE IF NOT EXISTS completed_tournament_cache (
  tournament_id INTEGER PRIMARY KEY,
  leaderboard_data JSONB NOT NULL,
  player_scores JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  tournament_end_date TIMESTAMPTZ NOT NULL
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_completed_tournament_cache_end_date 
ON completed_tournament_cache(tournament_end_date);

-- Index for tournament_id lookups (though it's already primary key, explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_completed_tournament_cache_tournament_id 
ON completed_tournament_cache(tournament_id);

-- Add RLS policies if needed
ALTER TABLE completed_tournament_cache ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to completed tournament cache" ON completed_tournament_cache
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow insert/update for service role (for caching operations)
CREATE POLICY "Allow insert/update for service role" ON completed_tournament_cache
  FOR ALL USING (auth.role() = 'service_role'); 