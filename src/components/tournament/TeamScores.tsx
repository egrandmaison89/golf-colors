import React from 'react';
import type { TeamScore } from '../../types/tournament';

interface TeamScoresProps {
  teamScores: TeamScore[];
  registeredTeams: Array<{ team_name: string; team_color: string; }>;
}

export function TeamScores({ teamScores, registeredTeams }: TeamScoresProps) {
  // Combine registered teams with their scores
  const allTeams = registeredTeams.map(team => {
    const teamScore = teamScores.find(ts => ts.team_name === team.team_name);
    return {
      ...team,
      total_score: teamScore?.total_score || 0,
      players: teamScore?.players || []
    };
  });

  const sortedTeams = [...allTeams].sort((a, b) => a.total_score - b.total_score);
  return (
    <div className="space-y-6">
      {sortedTeams.map((team, index) => (
        <div key={team.team_name} className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                index === 0 ? 'bg-yellow-100 text-yellow-700' :
                index === 1 ? 'bg-gray-100 text-gray-700' :
                index === 2 ? 'bg-orange-100 text-orange-700' :
                'bg-gray-50 text-gray-600'
              }`}>
                {index + 1}
              </div>
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: team.team_color.toLowerCase() }}
                />
                <h3 className="text-lg font-semibold text-gray-900">{team.team_name}</h3>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {team.total_score || 'No score yet'}
            </div>
          </div>
          <div className="space-y-2">
            {team.players.map(player => (
              <div 
                key={player.player_id} 
                className={`flex justify-between items-center rounded-lg p-3 ${
                  player.status === 'cut' ? 'bg-orange-50' : 'bg-gray-50'
                }`}
              >
                <span className="text-gray-700">
                  {player.firstName} {player.lastName}
                </span>
                <span className={`font-medium ${
                  player.status === 'withdrawn' ? 'text-red-600' :
                  player.status === 'cut' ? 'text-orange-600' :
                  player.score <= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {player.score > 0 ? `+${player.score}` : player.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}