import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { fetchYearlyLeaderboard, YearlyLeaderboardEntry } from '../utils/leaderboard';

export function LeagueOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<YearlyLeaderboardEntry[]>([]);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        console.debug('[LeagueOverview] Fetching yearly leaderboard...');
        const leaderboardData = await fetchYearlyLeaderboard();
        setLeaderboard(leaderboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
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
                      Avg Finish: {entry.averageFinish === 'N/A' ? 'N/A' : `${entry.averageFinish}$
                        {entry.averageFinish.endsWith('.0') ? '' :
                        entry.averageFinish.endsWith('.1') ? 'st' :
                        entry.averageFinish.endsWith('.2') ? 'nd' :
                        entry.averageFinish.endsWith('.3') ? 'rd' : 'th'
                      }`}
                    </div>
                  </div>
                </div>
                <div className={`text-lg font-bold ${
                  entry.totalEarnings >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${entry.totalEarnings >= 0 ? '+' : ''}${entry.totalEarnings.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}