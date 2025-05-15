// Netlify Scheduled Function: Calculate and upsert tournament results
// This function is triggered on a schedule via netlify.toml
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SPORTSDATA_API_KEY = process.env.VITE_SPORTSDATA_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface Tournament {
  TournamentID: number;
  Name: string;
  EndDate: string;
  Season: number;
}

interface TeamPlayer {
  player_id: number;
  betting_odds: number;
}

interface PlayerScore {
  PlayerID: number;
  TotalScore: number | null;
  TotalStrokes: number;
  Par: number;
}

interface TeamResult {
  profile_id: string;
  team_name: string;
  team_color: string;
  total_score: number;
  entry_id: string;
  player_odds: TeamPlayer[];
  place?: number;
  earnings?: number;
  winner_bonus?: number;
}

async function getAllTournaments(): Promise<Tournament[]> {
  const url = `https://api.sportsdata.io/golf/v2/json/Tournaments?key=${SPORTSDATA_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch tournaments');
  return (await res.json()) as Tournament[];
}

async function getTournamentScores(tournamentId: number): Promise<PlayerScore[]> {
  const url = `https://api.sportsdata.io/golf/v2/json/PlayerTournamentRoundScores/${tournamentId}?key=${SPORTSDATA_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch tournament scores');
  return (await res.json()) as PlayerScore[];
}

function isProfileObject(profiles: unknown): profiles is { id: string; team_name: string; team_color: string } {
  return (
    profiles !== null &&
    typeof profiles === 'object' &&
    !Array.isArray(profiles) &&
    'id' in profiles &&
    'team_name' in profiles
  );
}

async function calculateAndInsertResultsForTournament(tournament: Tournament) {
  const tournamentId = tournament.TournamentID;
  console.log(`Processing tournament: ${tournament.Name} (${tournamentId})`);

  // 1. Get all registered teams for the tournament
  const { data: entries, error: entriesError } = await supabase
    .from('tournament_entries')
    .select('id, user_id, profiles!inner(id, team_name, team_color)')
    .eq('tournament_id', tournamentId)
    .eq('status', 'registered');
  if (entriesError) throw entriesError;
  if (!entries || entries.length === 0) {
    console.log('No entries for this tournament.');
    return;
  }

  // 2. For each team, get their players and calculate total score
  const teamResults: TeamResult[] = [];
  for (const entry of entries) {
    const profile = isProfileObject(entry.profiles) ? entry.profiles : null;
    if (!profile || !profile.id) continue;
    const { data: teamPlayers } = await supabase
      .from('team_players')
      .select('player_id, betting_odds')
      .eq('entry_id', entry.id);
    if (!teamPlayers) continue;
    let totalScore = 0;
    const scores = await getTournamentScores(tournamentId);
    for (const tp of teamPlayers) {
      const player = scores.find((p) => p.PlayerID === tp.player_id);
      let playerScore = 0;
      if (player && player.TotalScore !== null) {
        playerScore = player.TotalScore;
      } else if (player) {
        playerScore = (player.TotalStrokes * 2) - (player.Par * 4);
      }
      totalScore += playerScore;
    }
    teamResults.push({
      profile_id: profile.id,
      team_name: profile.team_name,
      team_color: profile.team_color,
      total_score: totalScore,
      entry_id: entry.id,
      player_odds: teamPlayers.map(tp => ({
        player_id: tp.player_id,
        betting_odds: tp.betting_odds
      }))
    });
  }

  if (teamResults.length === 0) {
    console.log('No valid teams for this tournament.');
    return;
  }

  // 3. Sort teams by total_score (lowest is best)
  teamResults.sort((a, b) => a.total_score - b.total_score);

  // 4. Assign places (handle ties)
  let lastScore: number | null = null, lastPlace = 0;
  teamResults.forEach((team, idx) => {
    if (team.total_score === lastScore) {
      team.place = lastPlace;
    } else {
      team.place = idx + 1;
      lastScore = team.total_score;
      lastPlace = team.place;
    }
  });

  // 5. Calculate earnings
  const lowestScore = teamResults[0].total_score;
  const winners = teamResults.filter(t => t.total_score === lowestScore);
  const totalWinnings = teamResults.reduce((sum, t) => sum + (t.total_score - lowestScore), 0);
  teamResults.forEach(team => {
    if (team.total_score === lowestScore) {
      team.earnings = totalWinnings / winners.length;
    } else {
      team.earnings = -(team.total_score - lowestScore);
    }
    team.winner_bonus = 0; // Will be set below
  });

  // 6. Winner bonus logic
  const scores = await getTournamentScores(tournamentId);
  const winningPlayer = scores.sort((a, b) => (a.TotalScore ?? 9999) - (b.TotalScore ?? 9999))[0];
  const winningPlayerId = winningPlayer.PlayerID;
  for (const winner of winners) {
    const playerOdds = winner.player_odds;
    const sortedPlayers = [...playerOdds].sort((a, b) => a.betting_odds - b.betting_odds);
    const winnerRank = sortedPlayers.findIndex(tp => tp.player_id === winningPlayerId);
    let winnerBonus = 0;
    if (winnerRank === 0) winnerBonus = 10;
    else if (winnerRank === 1) winnerBonus = 20;
    else if (winnerRank === 2) winnerBonus = 30;
    winner.winner_bonus = winnerBonus;
    const sortedByScore = [...teamResults].sort((a, b) => b.total_score - a.total_score);
    if (winnerBonus >= 10 && sortedByScore[0]) sortedByScore[0].winner_bonus = (sortedByScore[0].winner_bonus || 0) - 10;
    if (winnerBonus >= 20 && sortedByScore[1]) sortedByScore[1].winner_bonus = (sortedByScore[1].winner_bonus || 0) - 10;
    if (winnerBonus === 30 && sortedByScore[2]) sortedByScore[2].winner_bonus = (sortedByScore[2].winner_bonus || 0) - 10;
  }

  // 7. Upsert results into tournament_results
  for (const team of teamResults) {
    await supabase
      .from('tournament_results')
      .upsert({
        tournament_id: tournamentId,
        profile_id: team.profile_id,
        team_name: team.team_name,
        team_color: team.team_color,
        total_score: team.total_score,
        place: team.place,
        earnings: team.earnings,
        winner_bonus: team.winner_bonus,
        completed_at: new Date(),
      }, { onConflict: 'tournament_id,profile_id' });
  }
  console.log(`Results for tournament ${tournamentId} calculated and upserted.`);
}

async function main() {
  try {
    const tournaments = await getAllTournaments();
    const now = new Date();
    const completedTournaments = tournaments.filter((t) => {
      const endDate = new Date(t.EndDate);
      return endDate < now && t.Season === 2025;
    });
    for (const tournament of completedTournaments) {
      await calculateAndInsertResultsForTournament(tournament);
    }
    console.log('All completed tournaments processed.');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'All completed tournaments processed.' })
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).message })
    };
  }
}

// Netlify handler
export async function handler() {
  return await main();
} 