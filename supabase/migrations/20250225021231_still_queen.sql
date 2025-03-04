/*
  # Add automatic tournament processing
  
  1. New Functions
    - process_tournament_for_all_users: Processes tournament results for all users
    - auto_process_completed_tournaments: Checks and processes completed tournaments
  
  2. New Trigger
    - tournament_completion_check: Automatically processes results when tournaments end
*/

-- Function to process tournament results for all users
CREATE OR REPLACE FUNCTION process_tournament_for_all_users(p_tournament_id integer)
RETURNS void AS $$
DECLARE
  tournament_data json;
  team_data record;
  team_scores json[];
  winner_data json;
  winner_team record;
  winner_bonus numeric;
  team_score integer;
  team_place integer;
  lowest_score integer;
  strokes_diff integer;
  total_teams integer;
BEGIN
  -- Get tournament data
  SELECT data::json INTO tournament_data
  FROM tournament_results_cache
  WHERE tournament_id = p_tournament_id;

  IF tournament_data IS NULL THEN
    RETURN;
  END IF;

  -- Get all teams and their players
  FOR team_data IN (
    SELECT 
      p.team_name,
      p.team_color,
      array_agg(json_build_object(
        'player_id', tp.player_id,
        'entry_id', tp.entry_id
      )) as team_players
    FROM team_players tp
    JOIN tournament_entries te ON tp.entry_id = te.id
    JOIN profiles p ON te.user_id = p.id
    WHERE te.tournament_id = p_tournament_id
    AND te.status = 'registered'
    GROUP BY p.team_name, p.team_color
  ) LOOP
    -- Calculate team score
    team_score := calculate_team_score(p_tournament_id, team_data.team_players, tournament_data);
    
    -- Store team score for sorting
    team_scores := array_append(
      team_scores,
      json_build_object(
        'team_name', team_data.team_name,
        'team_color', team_data.team_color,
        'score', team_score
      )
    );
  END LOOP;

  -- Process results if we have teams
  IF array_length(team_scores, 1) > 0 THEN
    PERFORM process_tournament_results(p_tournament_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check and process completed tournaments
CREATE OR REPLACE FUNCTION auto_process_completed_tournaments()
RETURNS void AS $$
DECLARE
  t record;
BEGIN
  -- Get completed tournaments that haven't been processed
  FOR t IN (
    SELECT DISTINCT tc.tournament_id
    FROM tournament_cache tc
    LEFT JOIN tournament_results tr ON tc.tournament_id = tr.tournament_id
    WHERE tc.end_date < CURRENT_DATE
    AND tr.tournament_id IS NULL
  ) LOOP
    -- Process each tournament
    PERFORM process_tournament_for_all_users(t.tournament_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to check for tournament completion
CREATE OR REPLACE FUNCTION check_tournament_completion()
RETURNS trigger AS $$
BEGIN
  -- Process completed tournaments
  PERFORM auto_process_completed_tournaments();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to tournament_cache table
DROP TRIGGER IF EXISTS tournament_completion_check ON tournament_cache;
CREATE TRIGGER tournament_completion_check
AFTER INSERT OR UPDATE ON tournament_cache
FOR EACH ROW
EXECUTE FUNCTION check_tournament_completion();

-- Process any existing completed tournaments
SELECT auto_process_completed_tournaments();