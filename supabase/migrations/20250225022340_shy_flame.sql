-- Add unique constraint to tournament_results
ALTER TABLE tournament_results
ADD CONSTRAINT tournament_results_tournament_team_unique UNIQUE (tournament_id, team_name);

-- Function to safely insert or update tournament results
CREATE OR REPLACE FUNCTION upsert_tournament_result(
  p_tournament_id integer,
  p_team_name text,
  p_team_color text,
  p_total_score integer,
  p_place integer,
  p_earnings numeric,
  p_winner_bonus numeric,
  p_completed_at timestamptz
)
RETURNS void AS $$
BEGIN
  INSERT INTO tournament_results (
    tournament_id,
    team_name,
    team_color,
    total_score,
    place,
    earnings,
    winner_bonus,
    completed_at
  ) VALUES (
    p_tournament_id,
    p_team_name,
    p_team_color,
    p_total_score,
    p_place,
    p_earnings,
    p_winner_bonus,
    p_completed_at
  )
  ON CONFLICT (tournament_id, team_name) 
  DO UPDATE SET
    team_color = EXCLUDED.team_color,
    total_score = EXCLUDED.total_score,
    place = EXCLUDED.place,
    earnings = EXCLUDED.earnings,
    winner_bonus = EXCLUDED.winner_bonus,
    completed_at = EXCLUDED.completed_at;
END;
$$ LANGUAGE plpgsql;

-- Update process_tournament_for_all_users to use upsert function
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
  tournament_end_date timestamptz;
BEGIN
  -- Get tournament data and end date
  SELECT data::json, end_date::timestamptz 
  INTO tournament_data, tournament_end_date
  FROM tournament_cache
  WHERE tournament_id = p_tournament_id;

  IF tournament_data IS NULL OR tournament_end_date IS NULL THEN
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
    WHERE te.tournament_id = p_tournament_id
    AND tp.player_id = (winner_data->>'PlayerID')::integer;

    -- Calculate lowest score
    SELECT MIN((value->>'score')::integer)
    INTO lowest_score
    FROM json_array_elements(array_to_json(team_scores)) value;

    -- Get total number of teams
    total_teams := array_length(team_scores, 1);

    -- Process each team's results
    FOR team_data IN (
      SELECT *,
        ROW_NUMBER() OVER (ORDER BY (value->>'score')::integer) as place
      FROM json_array_elements(array_to_json(team_scores))
    ) LOOP
      team_score := (team_data.value->>'score')::integer;
      team_place := team_data.place;
      
      -- Calculate earnings and bonus
      IF team_place = 1 THEN
        -- Winner gets $1 per stroke from each team they beat
        SELECT SUM((value->>'score')::integer - lowest_score)
        INTO strokes_diff
        FROM json_array_elements(array_to_json(team_scores))
        WHERE (value->>'score')::integer > lowest_score;
        
        -- Add winner bonus if applicable
        IF winner_team.team_name = (team_data.value->>'team_name') THEN
          winner_bonus := CASE
            WHEN team_place = total_teams THEN 30
            WHEN team_place = total_teams - 1 THEN 20
            ELSE 10
          END;
        ELSE
          winner_bonus := 0;
        END IF;

        -- Insert or update results
        PERFORM upsert_tournament_result(
          p_tournament_id,
          team_data.value->>'team_name',
          team_data.value->>'team_color',
          team_score,
          team_place,
          strokes_diff,
          winner_bonus,
          tournament_end_date
        );
      ELSE
        -- Losing teams pay $1 per stroke to winner
        strokes_diff := team_score - lowest_score;
        
        -- Subtract winner bonus if applicable
        IF winner_team.team_name IS NOT NULL 
           AND team_place = total_teams 
           AND (team_data.value->>'team_name') != winner_team.team_name THEN
          winner_bonus := -30;
        ELSIF winner_team.team_name IS NOT NULL 
              AND team_place = total_teams - 1 
              AND (team_data.value->>'team_name') != winner_team.team_name THEN
          winner_bonus := -20;
        ELSIF winner_team.team_name IS NOT NULL 
              AND team_place = total_teams - 2 
              AND (team_data.value->>'team_name') != winner_team.team_name THEN
          winner_bonus := -10;
        ELSE
          winner_bonus := 0;
        END IF;

        -- Insert or update results
        PERFORM upsert_tournament_result(
          p_tournament_id,
          team_data.value->>'team_name',
          team_data.value->>'team_color',
          team_score,
          team_place,
          -strokes_diff,
          winner_bonus,
          tournament_end_date
        );
      END IF;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Process all tournaments immediately
SELECT auto_process_completed_tournaments();