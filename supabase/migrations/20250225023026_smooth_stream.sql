/*
  # Process Tournament Results
  
  This migration ensures all completed tournament results are processed and stored.
  
  1. Adds function to force process all tournaments regardless of completion date
  2. Adds function to reprocess specific tournament results
  3. Processes all completed tournaments immediately
*/

-- Function to force process all tournaments
CREATE OR REPLACE FUNCTION force_process_all_tournaments()
RETURNS void AS $$
DECLARE
  t record;
BEGIN
  -- Get all tournaments from cache
  FOR t IN (
    SELECT DISTINCT tc.tournament_id, tc.end_date
    FROM tournament_cache tc
    WHERE tc.end_date < CURRENT_DATE
  ) LOOP
    -- Delete existing results for this tournament
    DELETE FROM tournament_results
    WHERE tournament_id = t.tournament_id;
    
    -- Process tournament results
    PERFORM process_tournament_for_all_users(t.tournament_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to reprocess specific tournament
CREATE OR REPLACE FUNCTION reprocess_tournament(p_tournament_id integer)
RETURNS void AS $$
BEGIN
  -- Delete existing results
  DELETE FROM tournament_results
  WHERE tournament_id = p_tournament_id;
  
  -- Process tournament results
  PERFORM process_tournament_for_all_users(p_tournament_id);
END;
$$ LANGUAGE plpgsql;

-- Process all tournaments immediately
SELECT force_process_all_tournaments();