import { createClient } from '@supabase/supabase-js';
import { getCachedLeaderboard } from './lib/tournament-cache'; // Adjust path if needed

// Set these from your Supabase project settings or .env file
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// List of completed tournament IDs to backfill
const completedTournamentIds = [628, 629, 654];

// Helper: Calculate team results from leaderboard data
function calculateTeamResults(leaderboard: any) {
  // You must adapt this logic to your leaderboard structure!
  // This is a placeholder for demonstration.
  if (!leaderboard || !leaderboard.Teams) return [];
  return leaderboard.Teams.map((team: any) => ({
    profile_id: team.ProfileID ?? null, // Use null if not available
    team_name: team.TeamName,
    team_color: team.TeamColor || 'Blue',
    earnings: team.Earnings || 0,
    winner_bonus: team.WinnerBonus || 0,
    place: team.Place || 0,
    total_score: team.TotalScore || 0,
  }));
}

async function upsertTournamentResults() {
  for (const tournamentId of completedTournamentIds) {
    console.log(`Processing tournament ${tournamentId}...`);
    const leaderboard = await getCachedLeaderboard(tournamentId, 'completed');
    const teamResults = calculateTeamResults(leaderboard);

    for (const team of teamResults) {
      const { error } = await supabase
        .from('tournament_results')
        .upsert({
          tournament_id: tournamentId,
          profile_id: team.profile_id,
          team_name: team.team_name,
          team_color: team.team_color,
          earnings: team.earnings,
          winner_bonus: team.winner_bonus,
          place: team.place,
          total_score: team.total_score,
        }, { onConflict: ['tournament_id', 'team_name'] }); // or ['tournament_id', 'profile_id'] if profile_id is unique
      if (error) {
        console.error(`[upsertTournamentResults] Failed for team ${team.team_name} in tournament ${tournamentId}:`, error);
      } else {
        console.log(`[upsertTournamentResults] Upserted result for team ${team.team_name} in tournament ${tournamentId}`);
      }
    }
  }
}

upsertTournamentResults().then(() => {
  console.log('Backfill complete.');
  process.exit(0);
}).catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});