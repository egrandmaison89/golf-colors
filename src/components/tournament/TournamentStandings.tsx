import React from 'react';
import { UserX } from 'lucide-react';
import type { Player, TeamPlayer } from '../../types/tournament';

interface TournamentStandingsProps {
  players: Player[];
  isFutureTournament: boolean;
  playerOdds: Array<{ PlayerID: number; OddsToWin: number }>;
  isRegistered: boolean;
  selectedPlayers: number[];
  teamPlayers: TeamPlayer[];
  onPlayerSelection: (playerId: number) => void;
  getPlayerStatus: (player: Player) => 'active' | 'cut' | 'withdrawn';
  calculatePlayerScore: (player: Player, allPlayers: Player[]) => number;
  renderPlayerScore: (player: Player, score: number, status: 'active' | 'cut' | 'withdrawn') => string;
}

export function TournamentStandings({
  players,
  isFutureTournament,
  playerOdds,
  isRegistered,
  selectedPlayers,
  teamPlayers,
  onPlayerSelection,
  getPlayerStatus,
  calculatePlayerScore,
  renderPlayerScore
}: TournamentStandingsProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Player
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isFutureTournament ? 'Odds to Win' : 'Total Score'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                THRU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {isFutureTournament && isRegistered && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team Selection
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {players.map((player) => {
              // Debug log for PlayerRoundScore
              console.log('Player:', player.FirstName, player.LastName, 'PlayerRoundScore:', player.PlayerRoundScore);
              const status = getPlayerStatus(player);
              const score = calculatePlayerScore(player, players);
              const isPlayerSelected = selectedPlayers.includes(player.PlayerID);
              const isPlayerTaken = teamPlayers.some(tp => 
                tp.player_id === player.PlayerID && !selectedPlayers.includes(player.PlayerID)
              );
              // Find today's round (robust logic)
              const today = new Date().toISOString().slice(0, 10);
              let progress = '';
              let roundToday = undefined;
              if (Array.isArray(player.PlayerRoundScore)) {
                roundToday = player.PlayerRoundScore.find(r => r.TeeTime && r.TeeTime.slice(0, 10) === today);
              }
              if (roundToday) {
                if (typeof roundToday.Thru === 'number' && roundToday.Thru > 0 && roundToday.Thru < 18) {
                  progress = `Thru ${roundToday.Thru}`;
                } else if (roundToday.Thru === 18) {
                  progress = 'F';
                } else if (roundToday.TeeTime && new Date(roundToday.TeeTime) > new Date()) {
                  progress = new Date(roundToday.TeeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
              }
              
              return (
                <tr
                  key={player.PlayerID}
                  className={`${status === 'withdrawn' ? 'bg-red-50' : 'hover:bg-gray-50'} ${
                    isPlayerSelected ? 'bg-green-50' : ''
                  } ${isPlayerTaken ? 'bg-gray-100' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {player.FirstName} {player.LastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {isFutureTournament ? (
                        playerOdds.find(p => p.PlayerID === player.PlayerID)?.OddsToWin 
                          ? `+${playerOdds.find(p => p.PlayerID === player.PlayerID)?.OddsToWin}`
                          : 'N/A'
                      ) : (
                        renderPlayerScore(player, score, status)
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{progress}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isFutureTournament ? (
                      isPlayerTaken ? (
                        <span className="text-gray-500">Already Selected</span>
                      ) : (
                        <span className="text-green-600">Available</span>
                      )
                    ) : status === 'withdrawn' ? (
                      <span className="flex items-center text-red-600">
                        <UserX className="h-4 w-4 mr-1" />
                        Withdrawn
                      </span>
                    ) : status === 'cut' ? (
                      <span className="flex items-center text-orange-600">
                        <UserX className="h-4 w-4 mr-1" />
                        CUT
                      </span>
                    ) : (
                      <span className="text-green-600">Active</span>
                    )}
                  </td>
                  {isFutureTournament && isRegistered && (
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => onPlayerSelection(player.PlayerID)}
                        disabled={(!isPlayerSelected && selectedPlayers.length >= 3) || isPlayerTaken}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          isPlayerSelected
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : isPlayerTaken
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : selectedPlayers.length >= 3
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {isPlayerSelected ? 'Remove' : isPlayerTaken ? 'Taken' : 'Select'}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}