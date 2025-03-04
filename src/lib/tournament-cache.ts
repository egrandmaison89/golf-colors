import { supabase } from './supabase';
import type { Tournament } from '../types/tournament';

const API_KEY = import.meta.env.VITE_SPORTSDATA_API_KEY;

export async function getTournamentData(tournamentId: number | string): Promise<any> {
  const numericId = typeof tournamentId === 'string' ? parseInt(tournamentId) : tournamentId;
  
  // First check cache
  const { data: cachedData, error: cacheError } = await supabase
    .from('tournament_cache')
    .select('*')
    .eq('tournament_id', numericId)
    .single();

  if (!cacheError && cachedData) {
    return cachedData.data;
  }

  // If not in cache, fetch from API
  const response = await fetch(
    `https://api.sportsdata.io/golf/v2/json/Tournaments?key=${API_KEY}`
  );
  if (!response.ok) throw new Error('Failed to fetch tournament data');
  const data = await response.json();
  
  const tournament = data.find((t: Tournament) => t.TournamentID === numericId);
  if (!tournament) throw new Error('Tournament not found');

  // Cache the data
  await supabase
    .from('tournament_cache')
    .insert([{
      tournament_id: numericId,
      name: tournament.Name,
      venue: tournament.Venue,
      location: tournament.Location,
      start_date: tournament.StartDate,
      end_date: tournament.EndDate,
      data: tournament
    }]);

  return tournament;
}

export async function getTournamentResults(tournamentId: number | string): Promise<any> {
  const numericId = typeof tournamentId === 'string' ? parseInt(tournamentId) : tournamentId;
  
  // Check if tournament is completed
  const { data: tournament } = await supabase
    .from('tournament_cache')
    .select('end_date')
    .eq('tournament_id', numericId)
    .single();

  if (tournament) {
    const endDate = new Date(tournament.end_date);
    const now = new Date();

    // If tournament is completed, check cache
    if (endDate < now) {
      const { data: cachedResults } = await supabase
        .from('tournament_results_cache')
        .select('data')
        .eq('tournament_id', numericId)
        .single();

      if (cachedResults) {
        return cachedResults.data;
      }
    }
  }

  // If not in cache or tournament is ongoing, fetch from API
  const response = await fetch(
    `https://api.sportsdata.io/golf/v2/json/PlayerTournamentRoundScores/${numericId}?key=${API_KEY}`
  );
  if (!response.ok) throw new Error('Failed to fetch tournament results');
  const data = await response.json();

  // If tournament is completed, cache the results
  if (tournament && new Date(tournament.end_date) < new Date()) {
    await supabase
      .from('tournament_results_cache')
      .insert([{
        tournament_id: numericId,
        data: data
      }]);
  }

  return data;
}

export async function getTournaments(): Promise<Tournament[]> {
  // First check cache for all tournaments
  const { data: cachedTournaments, error: cacheError } = await supabase
    .from('tournament_cache')
    .select('data')
    .order('start_date', { ascending: true });

  if (!cacheError && cachedTournaments && cachedTournaments.length > 0) {
    return cachedTournaments.map(t => t.data);
  }

  // If not in cache, fetch from API
  const response = await fetch(
    `https://api.sportsdata.io/golf/v2/json/Tournaments?key=${API_KEY}`
  );
  if (!response.ok) throw new Error('Failed to fetch tournaments');
  const data = await response.json();

  // Cache all tournaments
  const tournaments = data.filter((t: Tournament) => 
    new Date(t.StartDate).getFullYear() === 2025
  );

  await supabase.from('tournament_cache').insert(
    tournaments.map((t: Tournament) => ({
      tournament_id: t.TournamentID,
      name: t.Name,
      venue: t.Venue,
      location: t.Location,
      start_date: t.StartDate,
      end_date: t.EndDate,
      data: t
    }))
  );

  return tournaments;
}