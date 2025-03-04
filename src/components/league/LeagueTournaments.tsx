import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trophy } from 'lucide-react';
import { LeagueTournamentModal } from './LeagueTournamentModal';
import type { LeagueTournament } from '../../types/league';
import { supabase } from '../../lib/supabase';

interface LeagueTournamentsProps {
  leagueId: string;
  tournaments: LeagueTournament[];
  isAdmin: boolean;
  onTournamentAdded: () => void;
}

export function LeagueTournaments({
  leagueId,
  tournaments,
  isAdmin,
  onTournamentAdded
}: LeagueTournamentsProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  async function handleAddTournament(tournamentId: number, entryFee: number) {
    await supabase
      .from('league_tournaments')
      .insert({
        league_id: leagueId,
        tournament_id: tournamentId,
        entry_fee: entryFee
      });
    
    onTournamentAdded();
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">League Tournaments</h2>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 text-green-600 hover:text-green-700"
          >
            <Plus className="h-5 w-5" />
            <span>Add Tournament</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {tournaments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No tournaments have been added to this league yet.
          </p>
        ) : (
          tournaments.map((tournament) => (
            <Link
              key={tournament.id}
              to={`/tournament/${tournament.tournament_id}`}
              className="block bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Trophy className="h-5 w-5 text-green-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {tournament.tournament?.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {tournament.tournament?.venue}
                    </p>
                  </div>
                </div>
                {tournament.entry_fee > 0 && (
                  <span className="text-green-600 font-medium">
                    ${tournament.entry_fee}
                  </span>
                )}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                {new Date(tournament.tournament?.start_date || '').toLocaleDateString()} - {' '}
                {new Date(tournament.tournament?.end_date || '').toLocaleDateString()}
              </div>
            </Link>
          ))
        )}
      </div>

      <LeagueTournamentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        leagueId={leagueId}
        onAdd={handleAddTournament}
      />
    </div>
  );
}