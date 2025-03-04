import React from 'react';
import { UserX } from 'lucide-react';
import type { Player, TeamPlayer } from '../../types/tournament';

interface DraftedPlayersProps {
  players: Player[];
  teamPlayers: TeamPlayer[];
  getPlayerStatus: (player: Player) => 'active' | 'cut' | 'withdrawn';
  calculatePlayerScore: (player: Player, allPlayers: Player[]) => number;
  renderPlayerScore: (player: Player, score: number, status: 'active' | 'cut' | 'withdrawn') => string;
}

export function DraftedPlayers({
  players,
  teamPlayers,
  getPlayerStatus,
  calculatePlayerScore,
  renderPlayerScore
}: DraftedPlayersProps) {
  if (!teamPlayers.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No players have been drafted for this tournament yet.</p>
        <p className="text-sm text-gray-500">
          Players will appear here once teams start making their selections.
        </p>
      </div>
    );
  }

  const draftedPlayers = teamPlayers.reduce((acc, tp) => {
    const player = players.find(p => p.PlayerID === tp.player_id);
    if (!player) return acc;

    const status = getPlayerStatus(player, players);
    const score = calculatePlayerScore(player, players);

    const teamName = tp.profile?.team_name || 'Unknown Team';
    const teamColor = tp.profile?.team_color || 'Blue';

    acc.push({
      ...player,
      score,
      status,
      teamName,
      teamColor
    });
    
    return acc;
  }, [] as (Player & { score: number; status: 'active' | 'cut' | 'withdrawn'; teamName: string; teamColor: string })[]);

  const sortedPlayers = [...draftedPlayers].sort((a, b) => {
    if (a.status === 'withdrawn' && b.status !== 'withdrawn') return 1;
    if (a.status !== 'withdrawn' && b.status === 'withdrawn') return -1;
    if (a.status === 'cut' && b.status === 'active') return 1;
    if (a.status === 'active' && b.status === 'cut') return -1;
    return a.score - b.score;
  });

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Player
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedPlayers.map((player, index) => (
              <tr 
                key={player.PlayerID}
                className={`${
                  player.status === 'withdrawn' ? 'bg-red-50' : 
                  player.status === 'cut' ? 'bg-orange-50' : 
                  'hover:bg-gray-50'
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {player.FirstName} {player.LastName}
                      </div>
                      {player.status === 'withdrawn' && (
                        <div className="text-sm text-red-600 flex items-center mt-1">
                          <UserX className="h-4 w-4 mr-1" />
                          Withdrawn
                        </div>
                      )}
                      {player.status === 'cut' && (
                        <div className="text-sm text-orange-600 mt-1">
                          Cut
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: player.teamColor?.toLowerCase() || 'blue' }}
                    />
                    <span className="text-sm text-gray-900">{player.teamName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className={`text-sm font-medium ${
                    player.status === 'withdrawn' ? 'text-red-600' :
                    player.status === 'cut' ? 'text-orange-600' :
                    player.score <= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {renderPlayerScore(player, player.score, player.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}