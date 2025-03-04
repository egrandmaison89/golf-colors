/*
  # Add draft tables and initialize mock tournament

  1. New Tables
    - `draft_state`
      - `tournament_id` (integer, primary key)
      - `current_round` (integer)
      - `current_pick` (integer)
      - `draft_order` (text array)
      - `is_snake` (boolean)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `draft_picks`
      - `id` (uuid, primary key)
      - `tournament_id` (integer)
      - `round` (integer)
      - `pick` (integer)
      - `team_name` (text)
      - `player_id` (integer)
      - `player_name` (text)
      - `timestamp` (timestamptz)

  2. Changes
    - Add tables if they don't exist
    - Initialize mock tournament draft state
*/

DO $$ 
BEGIN
  -- Create draft state table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'draft_state') THEN
    CREATE TABLE draft_state (
      tournament_id integer PRIMARY KEY,
      current_round integer NOT NULL DEFAULT 1,
      current_pick integer NOT NULL DEFAULT 1,
      draft_order text[] NOT NULL,
      is_snake boolean NOT NULL DEFAULT true,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CHECK (status IN ('pending', 'in_progress', 'completed'))
    );

    ALTER TABLE draft_state ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Create draft picks table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'draft_picks') THEN
    CREATE TABLE draft_picks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tournament_id integer NOT NULL,
      round integer NOT NULL,
      pick integer NOT NULL,
      team_name text NOT NULL,
      player_id integer NOT NULL,
      player_name text NOT NULL,
      timestamp timestamptz DEFAULT now(),
      UNIQUE(tournament_id, player_id)
    );

    ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Add realtime if not already enabled
  ALTER TABLE IF EXISTS draft_state REPLICA IDENTITY FULL;
  ALTER TABLE IF EXISTS draft_picks REPLICA IDENTITY FULL;
END $$;