/*
  # Add automatic tournament results processor
  
  1. Changes
    - Add function to process tournament results
    - Add trigger to automatically process results when tournament ends
    - Add function to calculate team scores and payouts
    - Add function to identify tournament winner and bonuses

  2. Security
    - Maintain existing RLS policies
*/

-- Function to calculate team scores
CREATE OR REPLACE FUNCTION calculate_team_score(
  p_tournament_id integer,
  p_team_players json[],
  p_tournament_data json
)
RETURNS integer AS $$
DECLARE
  total_score integer := 0;
  player_data json;
  player_score integer;
  completed_rounds integer;
  total_par integer;
BEGIN
  FOREACH player_data IN ARRAY p_team_players
  LOOP
    -- Find player in tournament data
    SELECT json_array_elements(p_tournament_data::json)
    INTO player_data
    WHERE (player_data->>'PlayerID')::integer = (player_data->>'player_id')::integer;

    IF player_data IS NOT NULL THEN
      -- Check if player has withdrawn
      IF (player_data->>'IsWithdrawn')::boolean THEN
        -- Get highest score among all players and add 1
        SELECT COALESCE(MAX((data->>'TotalScore')::integer), 0) + 1
        INTO player_score
        FROM json_array_elements(p_tournament_data::json) AS data
        WHERE (data->>'IsWithdrawn')::boolean = false;
      ELSE
        -- Check if player was cut
        IF (player_data->>'TotalScore') IS NULL AND (player_data->>'TotalStrokes')::integer > 0 THEN
          -- Calculate cut score: (TotalStrokes × 2) - (Par × 4)
          SELECT COUNT(*)
          INTO completed_rounds
          FROM json_array_elements((player_data->>'PlayerRoundScore')::json) AS rounds
          WHERE (rounds->>'Score')::integer > 0 AND (rounds->>'Par')::integer > 0;

          IF completed_rounds > 0 THEN
            SELECT SUM((rounds->>'Par')::integer)
            INTO total_par
            FROM json_array_elements((player_data->>'PlayerRoundScore')::json) AS rounds
            WHERE (rounds->>'Score')::integer > 0 AND (rounds->>'Par')::integer > 0;

            player_score := ((player_data->>'TotalStrokes')::integer - total_par) * 2;
          ELSE
            player_score := 0;
          END IF;
        ELSE
          -- Use total score for active players
          player_score := COALESCE((player_data->>'TotalScore')::integer, 0);
        END IF;
      END IF;

      total_score := total_score + player_score;
    END IF;
  END LOOP;

  RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- Function to process tournament results
CREATE OR REPLACE FUNCTION process_tournament_results(tournament_id integer)
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
  WHERE tournament_id = tournament_id;

  IF tournament_data IS NULL THEN
    RAISE EXCEPTION 'Tournament data not found';
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
    WHERE te.tournament_id = tournament_id
    GROUP BY p.team_name, p.team_color
  ) LOOP
    -- Calculate team score
    team_score := calculate_team_score(tournament_id, team_data.team_players, tournament_data);
    
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

  -- Sort teams by score and process results
  SELECT MIN((score->>'score')::integer)
  INTO lowest_score
  FROM json_array_elements(array_to_json(team_scores)) score;

  total_teams := array_length(team_scores, 1);

  -- Find tournament winner
  SELECT data::json->0
  INTO winner_data
  FROM json_array_elements(tournament_data) data
  ORDER BY (data->>'TotalScore')::integer ASC
  LIMIT 1;

  -- Find team with tournament winner
  SELECT te.*, p.team_name, p.team_color
  INTO winner_team
  FROM team_players tp
  JOIN tournament_entries te ON tp.entry_id = te.id
  JOIN profiles p ON te.user_id = p.id
  WHERE te.tournament_id = tournament_id
  AND tp.player_id = (winner_data->>'PlayerID')::integer;

  -- Process each team's results
  FOR team_data IN (
    SELECT *,
      ROW_NUMBER() OVER (ORDER BY (value->>'score')::integer) as place
    FROM json_array_elements(array_to_json(team_scores))
  ) LOOP
    team_score := (team_data.value->>'score')::integer;
    team_place := team_data.place;
    
    -- Calculate earnings
    IF team_place = 1 THEN
      -- Winner gets $1 per stroke from each team they beat
      SELECT SUM((value->>'score')::integer - lowest_score)
      INTO strokes_diff
      FROM json_array_elements(array_to_json(team_scores))
      WHERE (value->>'score')::integer > lowest_score;
      
      -- Add winner bonus if applicable
      IF winner_team.team_name = team_data.value->>'team_name' THEN
        winner_bonus := CASE
          WHEN team_place = total_teams THEN 30
          WHEN team_place = total_teams - 1 THEN 20
          ELSE 10
        END;
      ELSE
        winner_bonus := 0;
      END IF;

      -- Store results
      PERFORM update_tournament_result(
        tournament_id,
        team_data.value->>'team_name',
        team_data.value->>'team_color',
        team_score,
        team_place,
        strokes_diff,
        winner_bonus
      );
    ELSE
      -- Losing teams pay $1 per stroke to winner
      strokes_diff := team_score - lowest_score;
      
      -- Subtract winner bonus if applicable
      IF winner_team.team_name IS NOT NULL 
         AND team_place = total_teams 
         AND team_data.value->>'team_name' != winner_team.team_name THEN
        winner_bonus := -30;
      ELSIF winner_team.team_name IS NOT NULL 
            AND team_place = total_teams - 1 
            AND team_data.value->>'team_name' != winner_team.team_name THEN
        winner_bonus := -20;
      ELSIF winner_team.team_name IS NOT NULL 
            AND team_place = total_teams - 2 
            AND team_data.value->>'team_name' != winner_team.team_name THEN
        winner_bonus := -10;
      ELSE
        winner_bonus := 0;
      END IF;

      -- Store results
      PERFORM update_tournament_result(
        tournament_id,
        team_data.value->>'team_name',
        team_data.value->>'team_color',
        team_score,
        team_place,
        -strokes_diff,
        winner_bonus
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to check if tournament has ended
CREATE OR REPLACE FUNCTION check_tournament_end()
RETURNS trigger AS $$
DECLARE
  tournament_end_date date;
BEGIN
  -- Get tournament end date
  SELECT end_date INTO tournament_end_date
  FROM tournament_cache
  WHERE tournament_id = NEW.tournament_id;

  -- If tournament has ended, process results
  IF tournament_end_date < CURRENT_DATE THEN
    PERFORM process_tournament_results(NEW.tournament_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically process results when tournament data is cached
CREATE TRIGGER process_tournament_results_trigger
AFTER INSERT OR UPDATE ON tournament_results_cache
FOR EACH ROW
EXECUTE FUNCTION check_tournament_end();