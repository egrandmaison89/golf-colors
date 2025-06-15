import { supabase } from './supabase';
import type { Tournament } from '../types/tournament';
import { loggedFetch } from './loggedFetch';
import { cachedApiFetch } from './apiCache';

const API_KEY = import.meta.env.VITE_SPORTSDATA_API_KEY;

// Increased TTL for active tournaments from 2 minutes to 30 minutes
const ACTIVE_TOURNAMENT_TTL = 30 * 60 * 1000; // 30 minutes
const COMPLETED_TOURNAMENT_TTL = 60 * 60 * 1000; // 1 hour (for in-memory cache)

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

export async function getTournamentResults(tournamentId: number | string): Promise<unknown> {
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

    // If tournament is completed, check permanent cache first
    if (endDate < now) {
      const { data: permanentCache } = await supabase
        .from('completed_tournament_cache')
        .select('player_scores')
        .eq('tournament_id', numericId)
        .single();

      if (permanentCache) {
        console.log(`[getTournamentResults] Using permanent cache for completed tournament ${numericId}`);
        return permanentCache.player_scores;
      }

      // If no permanent cache, check old cache
      const { data: cachedResults } = await supabase
        .from('tournament_results_cache')
        .select('data')
        .eq('tournament_id', numericId)
        .single();

      if (cachedResults) {
        // Migrate to permanent cache
        await supabase
          .from('completed_tournament_cache')
          .insert([{
            tournament_id: numericId,
            leaderboard_data: {}, // Will be populated by getCachedLeaderboard
            player_scores: cachedResults.data,
            tournament_end_date: endDate
          }]);
        
        console.log(`[getTournamentResults] Migrated to permanent cache for tournament ${numericId}`);
        return cachedResults.data;
      }
    }
  }

  // If not in cache or tournament is ongoing, fetch from API
  const url = `https://api.sportsdata.io/golf/v2/json/PlayerTournamentRoundScores/${numericId}?key=${API_KEY}`;
  const ttl = tournament && new Date(tournament.end_date) < new Date() ? COMPLETED_TOURNAMENT_TTL : ACTIVE_TOURNAMENT_TTL;
  const data = await cachedApiFetch(url, () => loggedFetch(url, undefined, 'getPlayerTournamentRoundScores').then(r => r.json()), ttl);
  if (!data) throw new Error('Failed to fetch tournament results');

  // If tournament is completed, cache permanently
  if (tournament && new Date(tournament.end_date) < new Date()) {
    await supabase
      .from('completed_tournament_cache')
      .upsert([{
        tournament_id: numericId,
        leaderboard_data: {}, // Will be populated by getCachedLeaderboard
        player_scores: data,
        tournament_end_date: new Date(tournament.end_date)
      }]);
    
    console.log(`[getTournamentResults] Permanently cached completed tournament ${numericId}`);
  } else {
    // For active tournaments, use the old cache table
    await supabase
      .from('tournament_results_cache')
      .upsert([{
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
  const numericId = typeof tournamentId === 'string' ? parseInt(tournamentId) : tournamentId;
  
  // For completed tournaments, check permanent cache first
  if (status === 'completed') {
    const { data: permanentCache } = await supabase
      .from('completed_tournament_cache')
      .select('leaderboard_data, tournament_end_date')
      .eq('tournament_id', numericId)
      .single();
    
    if (permanentCache && permanentCache.leaderboard_data && Object.keys(permanentCache.leaderboard_data).length > 0) {
      console.log(`[getCachedLeaderboard] Using permanent cache for completed tournament ${numericId}`);
      return permanentCache.leaderboard_data;
    }
  }

  const cacheKey = `leaderboard_${tournamentId}_${status}`;
  const now = Date.now();
  // 30 min cache for active, 1 hour for completed
  const maxAge = status === 'active' ? ACTIVE_TOURNAMENT_TTL : COMPLETED_TOURNAMENT_TTL;

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
  
  const ttl = status === 'active' ? ACTIVE_TOURNAMENT_TTL : COMPLETED_TOURNAMENT_TTL;
  const data: unknown = await cachedApiFetch(
    url,
    () => loggedFetch(url, undefined, 'getCachedLeaderboard').then(r => r.json()),
    ttl
  );
  if (!data || (typeof data === 'object' && data !== null && !('Players' in data))) {
    throw new Error('Failed to fetch leaderboard');
  }

  // For completed tournaments, store in permanent cache
  if (status === 'completed') {
    // Get tournament end date
    const { data: tournament } = await supabase
      .from('tournament_cache')
      .select('end_date')
      .eq('tournament_id', numericId)
      .single();
    
    if (tournament) {
      await supabase
        .from('completed_tournament_cache')
        .upsert([{
          tournament_id: numericId,
          leaderboard_data: data,
          player_scores: {}, // Will be populated by getTournamentResults if needed
          tournament_end_date: new Date(tournament.end_date)
        }]);
      
      console.log(`[getCachedLeaderboard] Permanently cached completed tournament leaderboard ${numericId}`);
    }
  } else {
    // Only cache in localStorage for 'active' tournaments
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(`${cacheKey}_time`, now.toString());
    } catch (e) {
      // If quota exceeded or other error, skip caching
      console.warn('Leaderboard cache error:', e);
    }
  }
  
  return data;
}