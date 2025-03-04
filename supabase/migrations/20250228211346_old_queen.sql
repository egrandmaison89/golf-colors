/*
  # Clear Test Data Safely
  
  This migration removes all test data while preserving the table structure.
  Uses DELETE instead of TRUNCATE to respect foreign key constraints and
  avoid system trigger permission issues.
  
  1. Tables Cleared (in order)
    - email_audit_log
    - draft_picks
    - draft_state  
    - tournament_results
    - tournament_results_cache
    - tournament_cache
    - team_players
    - tournament_entries
    - profiles
    
  2. Preserved
    - All table structures
    - Functions
    - Policies
    - Triggers
    - Indexes
*/

-- Clear data in correct order to respect foreign keys
DO $$ 
BEGIN
  -- Start with tables that have no foreign key dependencies
  DELETE FROM email_audit_log;
  DELETE FROM draft_picks;
  DELETE FROM draft_state;
  DELETE FROM tournament_results;
  DELETE FROM tournament_results_cache;
  DELETE FROM tournament_cache;
  
  -- Then clear tables with foreign key relationships
  DELETE FROM team_players;
  DELETE FROM tournament_entries;
  DELETE FROM profiles;
  
  -- Verify tables are empty
  ASSERT (SELECT COUNT(*) FROM email_audit_log) = 0, 'email_audit_log not empty';
  ASSERT (SELECT COUNT(*) FROM draft_picks) = 0, 'draft_picks not empty';
  ASSERT (SELECT COUNT(*) FROM draft_state) = 0, 'draft_state not empty';
  ASSERT (SELECT COUNT(*) FROM tournament_results) = 0, 'tournament_results not empty';
  ASSERT (SELECT COUNT(*) FROM tournament_results_cache) = 0, 'tournament_results_cache not empty';
  ASSERT (SELECT COUNT(*) FROM tournament_cache) = 0, 'tournament_cache not empty';
  ASSERT (SELECT COUNT(*) FROM team_players) = 0, 'team_players not empty';
  ASSERT (SELECT COUNT(*) FROM tournament_entries) = 0, 'tournament_entries not empty';
  ASSERT (SELECT COUNT(*) FROM profiles) = 0, 'profiles not empty';
END $$;