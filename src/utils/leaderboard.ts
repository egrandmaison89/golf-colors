import { supabase } from '../lib/supabase';

export interface YearlyLeaderboardEntry {
  team_name: string;
  team_color: string;
  totalEarnings: number;
  totalBounties: number;
  totalWins: number;
  tournamentsPlayed: number;
  averageFinish: string;
  combinedScore: number;
}

export async function fetchYearlyLeaderboard(): Promise<YearlyLeaderboardEntry[]> {
  console.debug('[YearlyLeaderboard] Fetching profiles...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, team_name, team_color');
  if (profilesError) {
    console.error('[YearlyLeaderboard] Failed to fetch profiles:', profilesError);
    return [];
  }
  if (!profiles) return [];

  const leaderboardData = await Promise.all(
    profiles.map(async (profile) => {
      const { data: results, error: resultsError } = await supabase
        .from('tournament_results')
        .select('earnings, winner_bonus, place, total_score')
        .eq('profile_id', profile.id);
      if (resultsError) {
        console.error(`[YearlyLeaderboard] Failed to fetch results for ${profile.team_name}:`, resultsError);
        return null;
      }
      const tournamentsPlayed = results?.length || 0;
      const completedResults = results?.filter(r => typeof r.place === 'number' && r.place > 0) || [];
      const averageFinish = completedResults.length > 0
        ? (completedResults.reduce((sum, r) => sum + r.place, 0) / completedResults.length).toFixed(1)
        : 'N/A';
      const totalEarnings = results?.reduce((sum, r) => sum + (r.earnings || 0), 0) || 0;
      const totalBounties = results?.reduce((sum, r) => sum + (r.winner_bonus || 0), 0) || 0;
      const totalWins = results?.filter(r => r.place === 1).length || 0;
      const combinedScore = completedResults.reduce((sum, r) => sum + (r.total_score || 0), 0);
      console.debug(`[YearlyLeaderboard] Team: ${profile.team_name}, Earnings: ${totalEarnings}, Bounties: ${totalBounties}, Wins: ${totalWins}, Played: ${tournamentsPlayed}, AvgFinish: ${averageFinish}, Combined: ${combinedScore}`);
      return {
        team_name: profile.team_name,
        team_color: profile.team_color || 'Blue',
        totalEarnings,
        totalBounties,
        totalWins,
        tournamentsPlayed,
        averageFinish,
        combinedScore
      };
    })
  );
  // Filter out nulls before sorting
  const filtered = leaderboardData.filter((entry): entry is YearlyLeaderboardEntry => entry !== null);
  return filtered.sort((a, b) => b.totalEarnings - a.totalEarnings);
} 