import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Tournament } from '../../types/tournament';

interface LeagueTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  leagueId: string;
  onAdd: (tournamentId: number, entryFee: number) => Promise<void>;
}

export function LeagueTournamentModal({ isOpen, onClose, leagueId, onAdd }: LeagueTournamentModalProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null);
  const [entryFee, setEntryFee] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAvailableTournaments() {
      try {
        // Get tournaments that haven't been added to this league yet
        const { data: existingTournaments } = await supabase
          .from('league_tournaments')
          .select('tournament_id')
          .eq('league_id', leagueId);

        const existingIds = new Set(existingTournaments?.map(t => t.tournament_id) || []);

        const { data: allTournaments } = await supabase
          .from('tournament_cache')
          .select('*')
          .gt('start_date', new Date().toISOString());

        if (allTournaments) {
          setTournaments(
            allTournaments
              .filter(t => !existingIds.has(t.tournament_id))
              .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
          );
        }
      } catch (err) {
        console.error('Error fetching tournaments:', err);
      }
    }

    if (isOpen) {
      fetchAvailableTournaments();
    }
  }, [isOpen, leagueId]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTournament) return;

    setError(null);
    setLoading(true);

    try {
      await onAdd(selectedTournament, entryFee);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tournament');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Add Tournament to League
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Tournament
              </label>
              <select
                required
                value={selectedTournament || ''}
                onChange={(e) => setSelectedTournament(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Select a tournament...</option>
                {tournaments.map((tournament) => (
                  <option key={`tournament-${tournament.tournament_id}`} value={tournament.tournament_id}>
                    {tournament.name} ({new Date(tournament.start_date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entry Fee ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={entryFee}
                onChange={(e) => setEntryFee(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !selectedTournament}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Tournament'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}