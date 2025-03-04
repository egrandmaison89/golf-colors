import React, { useEffect, useState } from 'react';
import { Trophy, DollarSign, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LeaderboardEntry {
  team_name: string;
  team_color: string;
  total_earnings: number;
  average_finish: string;
}

export function LeagueOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    async function fetchProfiles() {
      try {
        // Get all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('team_name, team_color');

        if (profilesError) throw profilesError;
        if (!profiles) return;

        // Get tournament results for each profile
        const leaderboardData = await Promise.all(
          profiles.map(async (profile) => {
            // Get all tournament results for this team
            const { data: results, error: resultsError } = await supabase
              .from('tournament_results')
              .select('earnings, winner_bonus, place')
              .eq('team_name', profile.team_name);

            if (resultsError) throw resultsError;

            // Calculate total earnings
            const totalEarnings = results?.reduce((sum, result) => {
              return sum + (result.earnings || 0) + (result.winner_bonus || 0);
            }, 0) || 0;

            // Calculate average finish
            const completedTournaments = results?.filter(r => r.place > 0) || [];
            const averageFinish = completedTournaments.length > 0
              ? (completedTournaments.reduce((sum, r) => sum + r.place, 0) / completedTournaments.length).toFixed(1)
              : 'N/A';

            return {
              team_name: profile.team_name,
              team_color: profile.team_color || 'Blue',
              total_earnings: totalEarnings,
              average_finish: averageFinish
            };
          })
        );

        // Sort by total earnings
        setLeaderboard(leaderboardData.sort((a, b) => b.total_earnings - a.total_earnings));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profiles');
      } finally {
        setLoading(false);
      }
    }

    fetchProfiles();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Colors Cup Results</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          See how you stack up.
        </p>
      </div>

      {/* Teams List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-blue-600">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Users className="h-6 w-6 mr-2" />
            The Boys
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {leaderboard.map((entry, index) => (
            <div key={entry.team_name} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.team_color.toLowerCase() }}
                      />
                      <span className="font-medium text-gray-900">{entry.team_name}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Avg Finish: {entry.average_finish === 'N/A' ? 'N/A' : `${entry.average_finish}${
                        entry.average_finish.endsWith('.0') ? '' :
                        entry.average_finish.endsWith('.1') ? 'st' :
                        entry.average_finish.endsWith('.2') ? 'nd' :
                        entry.average_finish.endsWith('.3') ? 'rd' : 'th'
                      }`}
                    </div>
                  </div>
                </div>
                <div className={`text-lg font-bold ${
                  entry.total_earnings >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${entry.total_earnings >= 0 ? '+' : ''}${entry.total_earnings.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}