-- Add function to check if tournament should be processed
CREATE OR REPLACE FUNCTION should_process_tournament(tournament_end_date timestamptz)
RETURNS boolean AS $$
BEGIN
  RETURN tournament_end_date < (CURRENT_TIMESTAMP - interval '1 day')
    AND tournament_end_date > (CURRENT_TIMESTAMP - interval '2 days');
END;
$$ LANGUAGE plpgsql;

-- Update auto_process_completed_tournaments to use time window
CREATE OR REPLACE FUNCTION auto_process_completed_tournaments()
RETURNS void AS $$
DECLARE
  t record;
BEGIN
  -- Get tournaments that ended between 24-48 hours ago
  FOR t IN (
    SELECT DISTINCT tc.tournament_id, tc.end_date
    FROM tournament_cache tc
    LEFT JOIN tournament_results tr ON tc.tournament_id = tr.tournament_id
    WHERE should_process_tournament(tc.end_date::timestamptz)
    AND tr.tournament_id IS NULL
  ) LOOP
    -- Process each tournament
    PERFORM process_tournament_for_all_users(t.tournament_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled function to run daily
CREATE OR REPLACE FUNCTION daily_tournament_processing()
RETURNS void AS $$
BEGIN
  PERFORM auto_process_completed_tournaments();
END;
$$ LANGUAGE plpgsql;

-- Process all past tournaments that haven't been processed yet
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN (
    SELECT DISTINCT tc.tournament_id
    FROM tournament_cache tc
    LEFT JOIN tournament_results tr ON tc.tournament_id = tr.tournament_id
    WHERE tc.end_date < CURRENT_DATE
    AND tr.tournament_id IS NULL
  ) LOOP
    PERFORM process_tournament_for_all_users(t.tournament_id);
  END LOOP;
END $$;