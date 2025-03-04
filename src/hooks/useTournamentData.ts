import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Tournament, Player, TeamPlayer } from '../types/tournament';

const API_KEY = import.meta.env.VITE_SPORTSDATA_API_KEY;

interface UseTournamentDataProps {
  tournamentId: string;
  user: any;
}

interface UseTournamentDataReturn {
  tournament: Tournament | null;
  players: Player[];
  teamPlayers: TeamPlayer[];
  selectedPlayers: number[];
  teamScores: any[];
  loading: boolean;
  error: string | null;
  playerOdds: any[];
  entries: Record<number, any[]>;
  isRegistered: boolean;
  isFutureTournament: boolean;
  wasUnregistered: boolean;
  handlePlayerSelection: (playerId: number) => Promise<void>;
  handleRegister: () => Promise<void>;
}

export function useTournamentData({
  tournamentId,
  user
}: UseTournamentDataProps): UseTournamentDataReturn {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [teamScores, setTeamScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerOdds, setPlayerOdds] = useState<any[]>([]);
  const [entries, setEntries] = useState<Record<number, any[]>>({});
  const [isRegistered, setIsRegistered] = useState(false);
  const [isFutureTournament, setIsFutureTournament] = useState(false);
  const [wasUnregistered, setWasUnregistered] = useState(false);

  // ... Copy all the existing data fetching logic from TournamentDetail.tsx ...
  // This includes the useEffect hooks for fetching tournament data, entries,
  // team players, etc.

  const handlePlayerSelection = async (playerId: number) => {
    // ... Copy the player selection logic from TournamentDetail.tsx ...
  };

  const handleRegister = async () => {
    // ... Copy the registration logic from TournamentDetail.tsx ...
  };

  return {
    tournament,
    players,
    teamPlayers,
    selectedPlayers,
    teamScores,
    loading,
    error,
    playerOdds,
    entries,
    isRegistered,
    isFutureTournament,
    wasUnregistered,
    handlePlayerSelection,
    handleRegister
  };
}