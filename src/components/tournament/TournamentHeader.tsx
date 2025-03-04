import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import type { Tournament } from '../../types/tournament';

interface TournamentHeaderProps {
  tournament: Tournament | null;
  isFutureTournament: boolean;
  isRegistered: boolean;
  user: any;
  onRegister: () => void;
  showTeamSelectionMessage: boolean;
  teamSelectionMessage: string;
}

export function TournamentHeader({
  tournament,
  isFutureTournament,
  isRegistered,
  user,
  onRegister,
  showTeamSelectionMessage,
  teamSelectionMessage
}: TournamentHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4 flex-1">
        <Link
          to="/tournaments"
          className="flex items-center text-green-600 hover:text-green-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Link>
        {showTeamSelectionMessage && user?.user && isRegistered && (
          <div className={`px-4 py-2 rounded-lg ${
            teamSelectionMessage.includes('complete')
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {teamSelectionMessage}
          </div>
        )}
      </div>
      <div className="flex items-center space-x-4">
        {isFutureTournament && user?.user && !isRegistered && (
          <button
            onClick={onRegister}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Register for Tournament
          </button>
        )}
        <Trophy className="h-6 w-6 text-green-600" />
        <span className="text-lg font-semibold text-gray-900">
          {tournament?.Name || 'Tournament Details'}
        </span>
      </div>
    </div>
  );
}