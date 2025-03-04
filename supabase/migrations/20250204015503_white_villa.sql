/*
  # Add team color and website URL to profiles

  1. Changes
    - Add team_color column to profiles table with default 'Blue'
    - Add website_url column to profiles table
    - Add check constraint to ensure team_color is one of the allowed values

  2. Notes
    - team_color is restricted to Red, Blue, Green, or Yellow
    - website_url is optional
*/

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS team_color text NOT NULL DEFAULT 'Blue',
ADD COLUMN IF NOT EXISTS website_url text;

-- Add check constraint for team_color
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_team_color_check'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_team_color_check
    CHECK (team_color IN ('Red', 'Blue', 'Green', 'Yellow'));
  END IF;
END $$;