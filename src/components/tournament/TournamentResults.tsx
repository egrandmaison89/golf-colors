import React from 'react';
import { Trophy } from 'lucide-react';
import type { TeamScore } from '../../types/tournament';

interface TournamentResultsProps {
  teamScores: TeamScore[];
  players: {
    PlayerID: number;
    TotalScore: number | null;
    // Add other relevant fields if needed
  }[];
  registeredTeams: { team_name: string; team_color: string }[];
}

export function TournamentResults({ teamScores, players, registeredTeams }: TournamentResultsProps) {
  if (!teamScores.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No teams have registered for this tournament yet.</p>
        <p className="text-sm text-gray-500">
          Teams will compete for prize money based on their combined scores.
          The team with the lowest combined score wins!
        </p>
      </div>
    );
  }

  const lowestScore = Math.min(...teamScores.map(t => t.total_score));
  const winningTeams = teamScores.filter(t => t.total_score === lowestScore);
  
  // Find tournament winner (lowest score)
  const tournamentWinner = [...players].sort((a, b) => {
    if (a.TotalScore === null && b.TotalScore === null) return 0;
    if (a.TotalScore === null) return 1;
    if (b.TotalScore === null) return -1;
    return a.TotalScore - b.TotalScore;
  })[0];

  // Find which team drafted the tournament winner
  const winnerTeam = teamScores.find(team => 
    team.players.some(p => p.player_id === tournamentWinner?.PlayerID)
  );

  // Calculate winner bonus if applicable
  const calculateWinnerBonus = (team: TeamScore) => {
    if (!tournamentWinner || !winnerTeam || team.team_name !== winnerTeam.team_name) return 0;
    
    // Find winner's rank in team based on selection order
    const winnerRank = team.players.findIndex(p => p.player_id === tournamentWinner.PlayerID);

    // Return bonus based on rank
    return winnerRank === 0 ? 10 : winnerRank === 1 ? 20 : 30;
  };

  const payouts = teamScores.map(team => {
    const winnerBonus = calculateWinnerBonus(team);
    const isLastPlace = team === teamScores[teamScores.length - 1];

    if (team.total_score === lowestScore) {
      const totalWinnings = teamScores.reduce((sum, t) => {
        if (t.total_score > lowestScore) {
          return sum + (t.total_score - lowestScore);
        }
        return sum;
      }, 0);

      return {
        team: team,
        amount: (totalWinnings / winningTeams.length) + winnerBonus
      };
    } else {
      const strokesBehind = team.total_score - lowestScore;
      let amount = -strokesBehind;
      
      // Add winner bonus if this team has the tournament winner
      if (winnerTeam && team.team_name === winnerTeam.team_name) {
        amount += calculateWinnerBonus(team);
      }
      
      // If this is the last place team and needs to pay winner bonus
      if (winnerTeam && isLastPlace && team.team_name !== winnerTeam.team_name) {
        amount -= calculateWinnerBonus(winnerTeam);
      }
      
      return {
        team: team,
        amount
      };
    }
  });

  return (
    <div className="space-y-8">
      {winningTeams.map((team, index) => (
        <div key={team.team_name} className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-green-800">
              {winningTeams.length > 1 ? `Co-Winner ${index + 1}` : 'Tournament Winner'}
            </h3>
            <div className="px-4 py-2 bg-green-100 rounded-lg">
              <span className="text-green-800 font-bold">
                Winnings: ${payouts.find(p => p.team.team_name === team.team_name)?.amount.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Trophy className="h-8 w-8 text-green-600" />
            <div>
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: (registeredTeams.find(rt => rt.team_name === team.team_name)?.team_color?.toLowerCase() || '#3b82f6') }}
                />
                <p className="text-lg font-medium text-green-900">{team.team_name}</p>
              </div>
              <p className="text-sm text-green-700">Final Score: {team.total_score}</p>
            </div>
          </div>
        </div>
      ))}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Final Results</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {payouts.map(({ team, amount }) => (
            <div key={team.team_name} className="px-6 py-4 flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: (registeredTeams.find(rt => rt.team_name === team.team_name)?.team_color?.toLowerCase() || '#3b82f6') }}
                  />
                  <p className="font-medium text-gray-900">{team.team_name}</p>
                </div>
                <p className="text-sm text-gray-500">Final Score: {team.total_score}</p>
                {calculateWinnerBonus(team) > 0 && (
                  <p className="text-sm text-green-600">
                    Tournament Winner Bonus: +${calculateWinnerBonus(team).toFixed(2)}
                  </p>
                )}
                {winnerTeam && team === teamScores[teamScores.length - 1] && team.team_name !== winnerTeam.team_name && (
                  <p className="text-sm text-red-600">
                    Tournament Winner Bonus Owed: -${calculateWinnerBonus(winnerTeam).toFixed(2)}
                  </p>
                )}
              </div>
              <div className={amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                {amount >= 0 ? `Wins $${amount.toFixed(2)}` : `Owes $${Math.abs(amount).toFixed(2)}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div> 
  );
}