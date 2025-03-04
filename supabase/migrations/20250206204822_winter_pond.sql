/*
  # Tournament Data Caching

  1. New Tables
    - `tournament_cache`
      - Stores tournament schedule and details
      - Used for tournament listings and details
    - `tournament_results_cache`
      - Stores player results for completed tournaments
      - Used for leaderboards and historical data

  2. Security
    - Enable RLS on new tables
    - Allow public read access
    - Restrict write access to authenticated users
*/

-- Create tournament cache table
CREATE TABLE IF NOT EXISTS tournament_cache (
  tournament_id integer PRIMARY KEY,
  name text NOT NULL,
  venue text NOT NULL,
  location text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  data jsonb NOT NULL,
  cached_at timestamptz DEFAULT now()
);

-- Create tournament results cache table
CREATE TABLE IF NOT EXISTS tournament_results_cache (
  tournament_id integer PRIMARY KEY,
  data jsonb NOT NULL,
  cached_at timestamptz DEFAULT now(),
  FOREIGN KEY (tournament_id) REFERENCES tournament_cache(tournament_id)
);

-- Enable RLS
ALTER TABLE tournament_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_results_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read access to tournament cache"
  ON tournament_cache
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to update tournament cache"
  ON tournament_cache
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to tournament results cache"
  ON tournament_results_cache
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to update tournament results cache"
  ON tournament_results_cache
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);