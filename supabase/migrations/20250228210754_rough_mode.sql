-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tournament_results_team_name ON tournament_results(team_name);
CREATE INDEX IF NOT EXISTS idx_tournament_results_completed_at ON tournament_results(completed_at DESC);

-- Function to safely get tournament results
CREATE OR REPLACE FUNCTION get_tournament_results(p_tournament_id integer)
RETURNS TABLE (
  id uuid,
  tournament_id integer,
  team_name text,
  team_color text,
  total_score integer,
  place integer,
  earnings numeric,
  winner_bonus numeric,
  completed_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM tournament_results
  WHERE tournament_id = p_tournament_id
  ORDER BY place ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get all tournament results for a team
CREATE OR REPLACE FUNCTION get_team_results(p_team_name text)
RETURNS TABLE (
  id uuid,
  tournament_id integer,
  team_name text,
  team_color text,
  total_score integer,
  place integer,
  earnings numeric,
  winner_bonus numeric,
  completed_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM tournament_results
  WHERE team_name = p_team_name
  ORDER BY completed_at DESC;
END;
$$ LANGUAGE plpgsql;