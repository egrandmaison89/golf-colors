import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Star } from 'lucide-react';

interface LeaderboardEntry {
  team_name: string;
  team_color: string;
  totalEarnings: number;
  totalBounties: number;
  totalWins: number;
  tournamentsPlayed: number;
  averageFinish: string;
  combinedScore: number;
}

export function LeaderboardFooter() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, team_name, team_color');
      if (!profiles) return setLoading(false);

      const leaderboardData = await Promise.all(
        profiles.map(async (profile) => {
          const { data: results } = await supabase
            .from('tournament_results')
            .select('earnings, winner_bonus, place, total_score')
            .eq('profile_id', profile.id);

          const tournamentsPlayed = results?.length || 0;
          const completedResults = results?.filter(r => typeof r.place === 'number' && r.place > 0) || [];
          const averageFinish = completedResults.length > 0
            ? (completedResults.reduce((sum, r) => sum + r.place, 0) / completedResults.length).toFixed(1)
            : 'N/A';
          const totalEarnings = results?.reduce((sum, r) => sum + (r.earnings || 0), 0) || 0;
          const totalBounties = results?.reduce((sum, r) => sum + (r.winner_bonus || 0), 0) || 0;
          const totalWins = results?.filter(r => r.place === 1).length || 0;
          const combinedScore = completedResults.reduce((sum, r) => sum + (r.total_score || 0), 0);

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
      setLeaderboard(leaderboardData.sort((a, b) => b.totalEarnings - a.totalEarnings));
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-green-700/80 via-blue-700/80 to-red-700/80 rounded-2xl shadow-xl p-4 max-w-6xl mx-auto mt-0">
      <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Trophy className="h-7 w-7 text-yellow-300" />
        Yearly Leaderboard
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-white">
          <thead>
            <tr className="bg-gradient-to-r from-green-800 via-blue-800 to-red-800">
              <th className="px-4 py-2 text-left" title="Leaderboard rank">Rank</th>
              <th className="px-4 py-2 text-left" title="Team name and color">Team</th>
              <th className="px-4 py-2 text-right" title="Total earnings (excluding bounties)">Earnings</th>
              <th className="px-4 py-2 text-right" title="Total bounties for picking tournament winners">Bounties</th>
              <th className="px-4 py-2 text-right" title="Number of tournament wins">Wins</th>
              <th className="px-4 py-2 text-right" title="Number of tournaments played">Played</th>
              <th className="px-4 py-2 text-right" title="Average finishing position">Avg Finish</th>
              <th className="px-4 py-2 text-right" title="Sum of all scores for completed tournaments">Combined Score</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, idx) => (
              <tr
                key={entry.team_name}
                className={
                  idx === 0
                    ? 'bg-yellow-400/20 text-yellow-200 font-bold'
                    : idx === 1
                    ? 'bg-gray-200/10 text-gray-100 font-semibold'
                    : idx === 2
                    ? 'bg-orange-300/10 text-orange-100 font-semibold'
                    : 'hover:bg-white/10 transition-colors'
                }
              >
                <td className="px-4 py-2">
                  {idx < 3 ? <Star className="inline h-5 w-5 text-yellow-300 mr-1" /> : null}
                  {idx + 1}
                </td>
                <td className="px-4 py-2 flex items-center gap-2">
                  <span
                    className="inline-block w-5 h-5 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: entry.team_color.toLowerCase() }}
                    title={`Team color: ${entry.team_color}`}
                  ></span>
                  <span className="font-medium">{entry.team_name}</span>
                </td>
                <td className="px-4 py-2 text-right">
                  ${entry.totalEarnings >= 0 ? '+' : ''}{entry.totalEarnings}
                </td>
                <td className="px-4 py-2 text-right">
                  ${entry.totalBounties >= 0 ? '+' : ''}{entry.totalBounties}
                </td>
                <td className="px-4 py-2 text-right">{entry.totalWins}</td>
                <td className="px-4 py-2 text-right">{entry.tournamentsPlayed}</td>
                <td className="px-4 py-2 text-right">{entry.averageFinish}</td>
                <td className="px-4 py-2 text-right">{entry.combinedScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 