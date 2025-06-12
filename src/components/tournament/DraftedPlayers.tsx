import React from 'react';
import { UserX } from 'lucide-react';
import type { Player, TeamPlayer } from '../../types/tournament';
import { PlayerCard } from './PlayerCard';
import type { Round } from './PlayerCard';

interface DraftedPlayersProps {
  players: Player[];
  teamPlayers: TeamPlayer[];
  getPlayerStatus: (player: Player) => 'active' | 'cut' | 'withdrawn';
  calculatePlayerScore: (player: Player, allPlayers: Player[], isDraftedTab: boolean) => number;
  renderPlayerScore: (player: Player, score: number, status: 'active' | 'cut' | 'withdrawn') => string;
  selectedPlayerId: number | null;
  setSelectedPlayerId: (id: number | null) => void;
  golfersMap: Record<number, { WorldGolfRank: number }>;
  thruMap?: Map<number, { holesCompleted: number, teeTime?: string }>;
  playerPositions: Record<number, string>;
}

// Type guard for Player with TotalThrough
function hasTotalThrough(player: unknown): player is Player & { TotalThrough: number } {
  return typeof player === 'object' && player !== null && 'TotalThrough' in player && typeof (player as { TotalThrough?: unknown }).TotalThrough === 'number';
}

// Type guard for team_color
function getTeamColor(profile: unknown): string {
  if (profile && typeof profile === 'object' && 'team_color' in profile && typeof (profile as { team_color?: unknown }).team_color === 'string') {
    return (profile as { team_color: string }).team_color;
  }
  return 'Blue';
}

// Type guard for Rounds
function hasRounds(player: unknown): player is { Rounds: unknown } {
  return typeof player === 'object' && player !== null && 'Rounds' in player;
}

export function DraftedPlayers({
  players,
  teamPlayers,
  getPlayerStatus,
  calculatePlayerScore,
  renderPlayerScore,
  selectedPlayerId,
  setSelectedPlayerId,
  golfersMap,
  thruMap,
  playerPositions
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

    const status = getPlayerStatus(player);
    const score = calculatePlayerScore(player, players, true);

    const teamName = tp.profile?.team_name || 'Unknown Team';
    const teamColor = getTeamColor(tp.profile);

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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POS</th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Player
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                THRU
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedPlayers.map((player) => {
              let progress = '';
              const pos = playerPositions[player.PlayerID];
              if (thruMap) {
                const thruData = thruMap.get(player.PlayerID);
                const holesCompleted = thruData?.holesCompleted;
                const teeTime = thruData?.teeTime;
                if (typeof holesCompleted === 'number' && holesCompleted > 0 && holesCompleted < 18) {
                  progress = `${holesCompleted}`;
                } else if (holesCompleted === 18) {
                  progress = 'F';
                } else if (teeTime && new Date(teeTime) > new Date()) {
                  progress = new Date(teeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else {
                  progress = '';
                }
              } else {
                // fallback to old logic if thruMap is not provided
              const today = new Date().toISOString().slice(0, 10);
              if (hasTotalThrough(player)) {
                const thru = player.TotalThrough;
                if (thru === 0 || thru === null) {
                  const roundToday = player.PlayerRoundScore?.find(r => r.TeeTime && r.TeeTime.slice(0, 10) === today);
                  if (roundToday?.TeeTime && new Date(roundToday.TeeTime) > new Date()) {
                    progress = new Date(roundToday.TeeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  }
                } else if (thru >= 18) {
                  progress = 'F';
                } else {
                  progress = `${thru}`;
                }
              } else {
                const roundToday = player.PlayerRoundScore?.find(r => r.TeeTime && r.TeeTime.slice(0, 10) === today);
                if (roundToday) {
                  if (typeof roundToday.Thru === 'number' && roundToday.Thru > 0 && roundToday.Thru < 18) {
                    progress = `${roundToday.Thru}`;
                  } else if (roundToday.Thru === 18) {
                    progress = 'F';
                  } else if (roundToday.TeeTime && new Date(roundToday.TeeTime) > new Date()) {
                    progress = new Date(roundToday.TeeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                  }
                }
              }
              return [
              <tr 
                key={player.PlayerID}
                className={`${
                  player.status === 'withdrawn' ? 'bg-red-50' : 
                  player.status === 'cut' ? 'bg-orange-50' : 
                  'hover:bg-gray-50'
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pos}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                        <div className="text-sm font-medium text-gray-900" 
                          style={{ cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => setSelectedPlayerId(player.PlayerID === selectedPlayerId ? null : player.PlayerID)}
                        >
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{progress}</div>
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
                </tr>,
                selectedPlayerId === player.PlayerID && (
                  <tr key={`player-card-${player.PlayerID}`}> 
                    <td colSpan={5} className="p-0">
                      <PlayerCard player={{
                        ...player,
                        WorldGolfRanking: golfersMap[player.PlayerID]?.WorldGolfRank ?? player.WorldGolfRanking,
                        ...(hasRounds(player) ? { Rounds: player.Rounds as Round[] } : {})
                      }} onClose={() => setSelectedPlayerId(null)} />
                    </td>
                  </tr>
                )
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}