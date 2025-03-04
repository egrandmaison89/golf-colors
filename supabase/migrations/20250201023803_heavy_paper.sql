/*
  # Initial Schema Setup for Fantasy Golf

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `team_name` (text, unique)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `tournament_entries`
      - `id` (uuid, primary key)
      - `tournament_id` (integer)
      - `user_id` (uuid, references profiles)
      - `created_at` (timestamp)
      - `status` (text)

    - `team_players`
      - `id` (uuid, primary key)
      - `entry_id` (uuid, references tournament_entries)
      - `player_id` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  team_name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tournament entries table
CREATE TABLE IF NOT EXISTS tournament_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id integer NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'registered',
  UNIQUE(tournament_id, user_id)
);

-- Create team players table
CREATE TABLE IF NOT EXISTS team_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES tournament_entries(id) NOT NULL,
  player_id integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(entry_id, player_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Tournament entries policies
CREATE POLICY "Users can view all tournament entries"
  ON tournament_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own tournament entries"
  ON tournament_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tournament entries"
  ON tournament_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Team players policies
CREATE POLICY "Users can view all team players"
  ON team_players FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own team players"
  ON team_players FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM tournament_entries 
      WHERE id = team_players.entry_id
    )
  );