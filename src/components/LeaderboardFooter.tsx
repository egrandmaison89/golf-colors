import React from 'react';
import { Trophy, Star } from 'lucide-react';
import { useYearlyLeaderboard } from '../hooks/useYearlyLeaderboard';

export function LeaderboardFooter() {
  const { leaderboard, loading } = useYearlyLeaderboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  function formatCurrency(value: number) {
    const sign = value >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(value)}`;
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-4 max-w-6xl mx-auto mt-0">
      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Trophy className="h-7 w-7 text-yellow-500" />
        Yearly Leaderboard
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-gray-900">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Rank</th>
              <th className="px-4 py-2 text-left">Team</th>
              <th className="px-4 py-2 text-right font-mono">Earnings</th>
              <th className="px-4 py-2 text-right font-mono">Bounties</th>
              <th className="px-4 py-2 text-right">Wins</th>
              <th className="px-4 py-2 text-right">Played</th>
              <th className="px-4 py-2 text-right">Avg Finish</th>
              <th className="px-4 py-2 text-right">Combined Score</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, idx) => (
              <tr
                key={entry.team_name}
                className={
                  idx === 0
                    ? 'bg-yellow-100 font-bold'
                    : idx === 1
                    ? 'bg-gray-50 font-semibold'
                    : idx === 2
                    ? 'bg-orange-50 font-semibold'
                    : 'hover:bg-gray-100 transition-colors'
                }
              >
                <td className="px-4 py-2 text-right font-mono">{idx < 3 ? <Star className="inline h-5 w-5 text-yellow-500 mr-1" /> : null}{idx + 1}</td>
                <td className="px-4 py-2 flex items-center gap-2">
                  <span
                    className="inline-block w-5 h-5 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: entry.team_color.toLowerCase() }}
                    title={`Team color: ${entry.team_color}`}
                  ></span>
                  <span className="font-medium">{entry.team_name}</span>
                </td>
                <td className={`px-4 py-2 text-right font-mono font-bold ${entry.totalEarnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(entry.totalEarnings)}</td>
                <td className={`px-4 py-2 text-right font-mono font-bold ${entry.totalBounties >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(entry.totalBounties)}</td>
                <td className="px-4 py-2 text-right font-mono">{entry.totalWins}</td>
                <td className="px-4 py-2 text-right font-mono">{entry.tournamentsPlayed}</td>
                <td className="px-4 py-2 text-right font-mono">{entry.averageFinish}</td>
                <td className="px-4 py-2 text-right font-mono">{entry.combinedScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 