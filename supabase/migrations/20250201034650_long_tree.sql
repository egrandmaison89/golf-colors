/*
  # Add draft tables

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

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create draft state table
CREATE TABLE IF NOT EXISTS draft_state (
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

-- Create draft picks table
CREATE TABLE IF NOT EXISTS draft_picks (
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

-- Enable RLS
ALTER TABLE draft_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;

-- Draft state policies
CREATE POLICY "Users can view all draft states"
  ON draft_state FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update draft state"
  ON draft_state FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert draft state"
  ON draft_state FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Draft picks policies
CREATE POLICY "Users can view all draft picks"
  ON draft_picks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own draft picks"
  ON draft_picks FOR INSERT
  TO authenticated
  WITH CHECK (
    team_name IN (
      SELECT team_name 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Add realtime
ALTER TABLE draft_state REPLICA IDENTITY FULL;
ALTER TABLE draft_picks REPLICA IDENTITY FULL;