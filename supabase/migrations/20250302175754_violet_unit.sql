/*
  # Add Leagues Support
  
  1. New Tables
    - `leagues`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `is_private` (boolean)
      - `invite_code` (text, unique) - for private leagues
      - `owner_id` (uuid) - references profiles
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `league_members`
      - `id` (uuid, primary key)
      - `league_id` (uuid) - references leagues
      - `user_id` (uuid) - references profiles
      - `role` (text) - enum: 'owner', 'admin', 'member'
      - `joined_at` (timestamptz)
    
    - `league_invites`
      - `id` (uuid, primary key)
      - `league_id` (uuid) - references leagues
      - `email` (text)
      - `invite_code` (text)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `league_tournaments`
      - `id` (uuid, primary key)
      - `league_id` (uuid) - references leagues
      - `tournament_id` (integer) - references tournament_cache
      - `entry_fee` (numeric)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
*/

-- Create leagues table
CREATE TABLE leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_private boolean NOT NULL DEFAULT false,
  invite_code text UNIQUE,
  owner_id uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create league_members table
CREATE TABLE league_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(league_id, user_id)
);

-- Create league_invites table
CREATE TABLE league_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create league_tournaments table
CREATE TABLE league_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES leagues(id) ON DELETE CASCADE NOT NULL,
  tournament_id integer REFERENCES tournament_cache(tournament_id) ON DELETE CASCADE NOT NULL,
  entry_fee numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(league_id, tournament_id)
);

-- Enable RLS
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_tournaments ENABLE ROW LEVEL SECURITY;

-- Leagues policies
CREATE POLICY "Public leagues are viewable by everyone"
  ON leagues
  FOR SELECT
  USING (
    is_private = false OR
    auth.uid() IN (
      SELECT user_id 
      FROM league_members 
      WHERE league_id = leagues.id
    )
  );

CREATE POLICY "Users can create leagues"
  ON leagues
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "League owners and admins can update leagues"
  ON leagues
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM league_members 
      WHERE league_id = id 
      AND role IN ('owner', 'admin')
    )
  );

-- League members policies
CREATE POLICY "Users can view members of their leagues"
  ON league_members
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM league_members 
      WHERE league_id = league_members.league_id
    )
  );

CREATE POLICY "League owners and admins can manage members"
  ON league_members
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM league_members 
      WHERE league_id = league_members.league_id 
      AND role IN ('owner', 'admin')
    )
  );

-- League invites policies
CREATE POLICY "League owners and admins can manage invites"
  ON league_invites
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM league_members 
      WHERE league_id = league_invites.league_id 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view invites sent to their email"
  ON league_invites
  FOR SELECT
  TO authenticated
  USING (
    email = auth.email()
  );

-- League tournaments policies
CREATE POLICY "League members can view tournaments"
  ON league_tournaments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM league_members 
      WHERE league_id = league_tournaments.league_id
    )
  );

CREATE POLICY "League owners and admins can manage tournaments"
  ON league_tournaments
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM league_members 
      WHERE league_id = league_tournaments.league_id 
      AND role IN ('owner', 'admin')
    )
  );

-- Functions
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text AS $$
BEGIN
  RETURN UPPER(SUBSTRING(MD5(RANDOM()::text) FOR 8));
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create owner as member
CREATE OR REPLACE FUNCTION create_league_owner_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO league_members (league_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_league_owner_member_trigger
AFTER INSERT ON leagues
FOR EACH ROW
EXECUTE FUNCTION create_league_owner_member();

-- Trigger to generate invite code for private leagues
CREATE OR REPLACE FUNCTION generate_league_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_private AND NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_league_invite_code_trigger
BEFORE INSERT ON leagues
FOR EACH ROW
EXECUTE FUNCTION generate_league_invite_code();