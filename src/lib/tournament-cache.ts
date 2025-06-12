import { supabase } from './supabase';
import type { Tournament } from '../types/tournament';
import { loggedFetch } from './loggedFetch';
import { cachedApiFetch } from './apiCache';

const API_KEY = import.meta.env.VITE_SPORTSDATA_API_KEY;

export async function getTournamentData(tournamentId: number | string): Promise<unknown> {
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
  const url = `https://api.sportsdata.io/golf/v2/json/Tournaments?key=${API_KEY}`;
  const data: unknown = await cachedApiFetch(url, () => loggedFetch(url, undefined, 'getTournamentData').then(r => r.json()), 60 * 60 * 1000); // 1 hour TTL
  if (!data || !Array.isArray(data)) throw new Error('Failed to fetch tournament data');
  const tournament = (data as Tournament[]).find((t: Tournament) => t.TournamentID === numericId);
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
  const url = `https://api.sportsdata.io/golf/v2/json/PlayerTournamentRoundScores/${numericId}?key=${API_KEY}`;
  const data = await cachedApiFetch(url, () => loggedFetch(url, undefined, 'getPlayerTournamentRoundScores').then(r => r.json()), 2 * 60 * 1000); // 2 min TTL
  if (!data) throw new Error('Failed to fetch tournament results');

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
  const url = `https://api.sportsdata.io/golf/v2/json/Tournaments?key=${API_KEY}`;
  const data: unknown = await cachedApiFetch(url, () => loggedFetch(url, undefined, 'getTournaments').then(r => r.json()), 60 * 60 * 1000); // 1 hour TTL
  if (!data || !Array.isArray(data)) throw new Error('Failed to fetch tournaments');

  // Cache all tournaments
  const tournamentsData = (data as Tournament[]).filter((t: Tournament) => 
    new Date((t as Tournament).StartDate).getFullYear() === 2025
  );

  await supabase.from('tournament_cache').insert(
    tournamentsData.map((t: Tournament) => ({
      tournament_id: t.TournamentID,
      name: t.Name,
      venue: t.Venue,
      location: t.Location,
      start_date: t.StartDate,
      end_date: t.EndDate,
      data: t
    }))
  );

  return tournamentsData;
}

export async function getCachedLeaderboard(tournamentId: number | string, status: 'active' | 'completed'): Promise<unknown> {
  const cacheKey = `leaderboard_${tournamentId}_${status}`;
  const now = Date.now();
  // 5 min cache for active, 1 hour for completed
  const maxAge = status === 'active' ? 5 * 60 * 1000 : 60 * 60 * 1000;

  // Only use localStorage for 'active' tournaments (smaller data)
  if (status === 'active') {
    const cache = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(`${cacheKey}_time`);
    if (cache && cacheTime && now - parseInt(cacheTime) < maxAge) {
      return JSON.parse(cache);
    }
  }

  let url = '';
  if (status === 'active') {
    url = `https://api.sportsdata.io/golf/v2/json/LeaderboardBasic/${tournamentId}?key=${API_KEY}`;
  } else {
    url = `https://api.sportsdata.io/golf/v2/json/LeaderboardBasicFinal/${tournamentId}?key=${API_KEY}`;
  }
  const data: unknown = await cachedApiFetch(
    url,
    () => loggedFetch(url, undefined, 'getCachedLeaderboard').then(r => r.json()),
    status === 'active' ? 2 * 60 * 1000 : 60 * 60 * 1000 // 2 min for active, 1 hour for completed
  );
  if (!data || (typeof data === 'object' && data !== null && !('Players' in data))) {
    throw new Error('Failed to fetch leaderboard');
  }

  // Only cache in localStorage for 'active' tournaments
  if (status === 'active') {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(`${cacheKey}_time`, now.toString());
    } catch (e) {
      // If quota exceeded or other error, skip caching
      console.warn('Leaderboard cache error:', e);
    }
  }
  // For 'completed', do not cache in localStorage (data is too large)
  return data;
}