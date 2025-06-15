import { useEffect, useState } from 'react';
import { getTournaments } from '../lib/tournament-cache';
import { supabase } from '../lib/supabase';
import { calculatePlayerScore } from '../utils/tournament';
import type { Player } from '../types/tournament';

export interface YearlyLeaderboardEntry {
  team_name: string;
  team_color: string;
  totalEarnings: number;
  totalBounties: number;
  totalWins: number;
  tournamentsPlayed: number;
  averageFinish: string;
  combinedScore: number;
}

const CACHE_KEY = 'yearly_leaderboard_cache_v3'; // Incremented version for new caching strategy
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const CACHE_IDS_KEY = 'yearly_leaderboard_completed_ids_v3';

export function useYearlyLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<YearlyLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function buildLeaderboard(forceRebuild = false) {
      setLoading(true);
      // Fetch all tournaments
      const tournaments = await getTournaments();
      const now = new Date();
      // Only completed tournaments
      const completedTournaments = tournaments.filter(t => new Date(t.EndDate) < now);
      const completedIds = completedTournaments.map(t => t.TournamentID).sort();
      const completedIdsStr = JSON.stringify(completedIds);
      
      // Try cache first, but only if completed tournament IDs match
      const cache = localStorage.getItem(CACHE_KEY);
      const cacheTime = localStorage.getItem(CACHE_KEY + '_time');
      const cachedIds = localStorage.getItem(CACHE_IDS_KEY);
      if (!forceRebuild && cache && cacheTime && cachedIds === completedIdsStr && Date.now() - parseInt(cacheTime) < CACHE_TTL) {
        setLeaderboard(JSON.parse(cache));
        setLoading(false);
        return;
      }
      
      // For each tournament, fetch leaderboard and team_players using permanent cache
      const teamResults: Record<string, {
        team_color: string;
        earnings: number;
        bounties: number;
        wins: number;
        finishes: number[];
        scores: number[];
        tournamentsPlayed: number;
        combinedScore: number;
      }> = {};
      
      for (const tournament of completedTournaments) {
        let leaderboardData: { Players?: Player[] } | null = null;
        
        try {
          // First try permanent cache
          const { data: permanentCache } = await supabase
            .from('completed_tournament_cache')
            .select('leaderboard_data')
            .eq('tournament_id', tournament.TournamentID)
            .single();
          
          if (permanentCache && permanentCache.leaderboard_data && Object.keys(permanentCache.leaderboard_data).length > 0) {
            leaderboardData = permanentCache.leaderboard_data as { Players?: Player[] };
            console.log(`[useYearlyLeaderboard] Using permanent cache for tournament ${tournament.TournamentID}`);
          } else {
            // Fallback to getCachedLeaderboard (which will populate permanent cache)
            const { getCachedLeaderboard } = await import('../lib/tournament-cache');
            leaderboardData = await getCachedLeaderboard(tournament.TournamentID, 'completed') as { Players?: Player[] };
            console.log(`[useYearlyLeaderboard] Fallback to getCachedLeaderboard for tournament ${tournament.TournamentID}`);
          }
        } catch (error) {
          console.warn(`[useYearlyLeaderboard] Failed to get data for tournament ${tournament.TournamentID}:`, error);
          continue;
        }
        
        if (!leaderboardData?.Players) {
          console.warn(`[useYearlyLeaderboard] No player data for tournament ${tournament.TournamentID}`);
          continue;
        }
        
        // Fetch team_players for this tournament
        const { data: teamPlayersData } = await supabase
          .from('team_players')
          .select('player_id, entry_id, tournament_entries!inner(profiles(team_name, team_color))')
          .eq('tournament_entries.tournament_id', tournament.TournamentID);
        
        if (!teamPlayersData) continue;
        
        // Build team map: team_name -> { color, player_ids }
        const teamMap: Record<string, { color: string; player_ids: number[] }> = {};
        for (const tp of teamPlayersData) {
          // Handle both array and object forms of profiles
          const tournamentEntry = tp.tournament_entries as { profiles?: { team_name?: string; team_color?: string } | { team_name?: string; team_color?: string }[] };
          let teamName = 'Unknown Team';
          let teamColor = 'Blue';
          
          if (tournamentEntry?.profiles) {
            if (Array.isArray(tournamentEntry.profiles)) {
              teamName = tournamentEntry.profiles[0]?.team_name || 'Unknown Team';
              teamColor = tournamentEntry.profiles[0]?.team_color || 'Blue';
            } else {
              teamName = tournamentEntry.profiles.team_name || 'Unknown Team';
              teamColor = tournamentEntry.profiles.team_color || 'Blue';
            }
          }
          
          if (!teamMap[teamName]) teamMap[teamName] = { color: teamColor, player_ids: [] };
          teamMap[teamName].player_ids.push(tp.player_id);
        }
        
        // Calculate team scores using calculatePlayerScore (with cut logic)
        const players: Player[] = leaderboardData.Players || [];
        const teamScores: { team_name: string; team_color: string; score: number; player_ids: number[] }[] = [];
        for (const [teamName, { color, player_ids }] of Object.entries(teamMap)) {
          let score = 0;
          for (const pid of player_ids) {
            const player = players.find((p: Player) => p.PlayerID === pid);
            if (player) score += calculatePlayerScore(player, players, true);
          }
          teamScores.push({ team_name: teamName, team_color: color, score, player_ids });
        }
        
        // Sort teams by score (lower is better)
        teamScores.sort((a, b) => a.score - b.score);
        // Assign places
        const places = teamScores.map((t, i) => ({ ...t, place: i + 1 }));
        
        // Find winner(s)
        const minScore = Math.min(...teamScores.map(t => t.score));
        const winners = teamScores.filter(t => t.score === minScore);
        // Wins: fractional for ties
        const winValue = 1 / winners.length;
        
        // Calculate earnings, bounties, etc.
        // Find tournament winner (lowest individual TotalScore)
        const tournamentWinner = [...players].sort((a, b) => (a.TotalScore ?? 9999) - (b.TotalScore ?? 9999))[0];
        // Find which team(s) drafted the tournament winner
        const winnerTeams = teamScores.filter(team => team.player_ids.includes(tournamentWinner?.PlayerID));
        
        // Calculate bounty for each team
        const bountyMap: Record<string, number> = {};
        for (const team of teamScores) {
          let bounty = 0;
          if (winnerTeams.some(wt => wt.team_name === team.team_name)) {
            // Winner bonus: +10 if winner is 1st pick, +20 if 2nd, +30 if 3rd (use lowest pick for ties)
            const pickOrder = team.player_ids.findIndex(pid => pid === tournamentWinner?.PlayerID);
            bounty = pickOrder === 0 ? 10 : pickOrder === 1 ? 20 : 30;
          }
          bountyMap[team.team_name] = bounty;
        }
        
        // The team(s) in last place pay the bounty (split if multiple)
        const lastPlaceScore = Math.max(...teamScores.map(t => t.score));
        const lastPlaceTeams = teamScores.filter(t => t.score === lastPlaceScore);
        for (const team of lastPlaceTeams) {
          // If the last place team did NOT draft the winner, they pay the bounty to the winner team(s)
          if (!winnerTeams.some(wt => wt.team_name === team.team_name)) {
            // Pay bounty to each winner team (split if multiple last place teams)
            for (const wt of winnerTeams) {
              bountyMap[team.team_name] = (bountyMap[team.team_name] || 0) - (bountyMap[wt.team_name] || 0) / lastPlaceTeams.length;
            }
          }
        }
        
        // Aggregate results
        for (const t of places) {
          if (!teamResults[t.team_name]) {
            teamResults[t.team_name] = {
              team_color: t.team_color,
              earnings: 0,
              bounties: 0,
              wins: 0,
              finishes: [],
              scores: [],
              tournamentsPlayed: 0,
              combinedScore: 0,
            };
          }
          teamResults[t.team_name].tournamentsPlayed++;
          teamResults[t.team_name].finishes.push(t.place);
          teamResults[t.team_name].scores.push(t.score);
          teamResults[t.team_name].combinedScore += t.score;
          
          // Wins: fractional for ties
          if (t.score === minScore) {
            teamResults[t.team_name].wins += winValue;
          }
          
          // Earnings: winner(s) get sum of strokes ahead of all other teams; losers: negative earnings (strokes behind winner)
          if (t.score === minScore) {
            // Calculate the total pot (sum of strokes ahead of all other teams)
            const pot = teamScores.reduce((sum, other) => {
              if (other.score > t.score) return sum + (other.score - t.score);
              return sum;
            }, 0);
            // Split the pot among all tied winners
            teamResults[t.team_name].earnings += pot / winners.length;
          } else {
            teamResults[t.team_name].earnings -= (t.score - minScore);
          }
          
          // Bounties: net (won minus lost)
          teamResults[t.team_name].bounties += bountyMap[t.team_name] || 0;
        }
      }
      
      // Aggregate leaderboard
      const leaderboardArr: YearlyLeaderboardEntry[] = Object.entries(teamResults).map(([team_name, data]) => ({
        team_name,
        team_color: data.team_color,
        totalEarnings: data.earnings,
        totalBounties: data.bounties,
        totalWins: parseFloat(data.wins.toFixed(2)),
        tournamentsPlayed: data.tournamentsPlayed,
        averageFinish: data.finishes.length > 0 ? (data.finishes.reduce((a, b) => a + b, 0) / data.finishes.length).toFixed(1) : 'N/A',
        combinedScore: data.combinedScore,
      }));
      
      leaderboardArr.sort((a, b) => b.totalEarnings - a.totalEarnings);
      setLeaderboard(leaderboardArr);
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(leaderboardArr));
      localStorage.setItem(CACHE_KEY + '_time', Date.now().toString());
      localStorage.setItem(CACHE_IDS_KEY, completedIdsStr);
      setLoading(false);
    }
    buildLeaderboard();
  }, []);

  return { leaderboard, loading };
} 