import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Tournament, Player } from '../types/tournament';
import { calculatePlayerScore } from '../utils/tournament';
import { getCachedLeaderboard } from '../lib/tournament-cache';
import { loggedFetch } from '../lib/loggedFetch';

const API_KEY = import.meta.env.VITE_SPORTSDATA_API_KEY;

interface TournamentResult {
  tournament: Tournament;
  place: number;
  teamScore: number;
  status: 'upcoming' | 'active' | 'completed';
  winnerBonus: number;
  earnings: number;
}

interface Stats {
  totalWins: number;
  totalBonuses: number;
  averageFinish: string;
  totalEarnings: number;
}

interface UseMyResultsReturn {
  results: TournamentResult[];
  loading: boolean;
  error: string | null;
  stats: Stats;
}

export function MyResults() {
  const { results, loading, error, stats } = useMyResults();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link
          to="/tournaments"
          className="flex items-center text-green-600 hover:text-green-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Tournaments
        </Link>
        <div className="flex items-center space-x-2">
          <Trophy className="h-6 w-6 text-green-600" />
          <span className="text-lg font-semibold text-gray-900">My Tournament Results</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-sm text-gray-500 mb-2">Total Wins</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalWins}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-sm text-gray-500 mb-2">Winner Bonuses</div>
          <div className={`text-3xl font-mono font-bold ${stats.totalBonuses >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(stats.totalBonuses)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-sm text-gray-500 mb-2">Average Finish</div>
          <div className="text-3xl font-bold text-gray-900">
            {stats.averageFinish === 'N/A' ? 'N/A' : `${stats.averageFinish}${
              stats.averageFinish.endsWith('.0') ? '' :
              stats.averageFinish.endsWith('.1') ? 'st' :
              stats.averageFinish.endsWith('.2') ? 'nd' :
              stats.averageFinish.endsWith('.3') ? 'rd' : 'th'
            }`}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-sm text-gray-500 mb-2">Team Earnings</div>
          <div className={`text-3xl font-mono font-bold ${stats.totalEarnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(stats.totalEarnings)}</div>
        </div>
      </div>

      <div className="grid gap-6">
        {results.map((result) => (
          <Link
            key={result.tournament.TournamentID}
            to={`/tournament/${result.tournament.TournamentID}`}
            className="block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {result.tournament.Name}
                </h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  result.status === 'completed'
                    ? 'bg-gray-100 text-gray-600'
                    : result.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                </span>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Tournament Dates</p>
                  <p className="text-gray-900">
                    {new Date(result.tournament.StartDate).toLocaleDateString()} - {' '}
                    {new Date(result.tournament.EndDate).toLocaleDateString()}
                  </p>
                </div>

                {(result.status === 'completed' || result.status === 'active') && (
                  <>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Current Place</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {result.place === 0 ? (
                          <span className="text-sm font-normal text-gray-500">
                            No team selected
                          </span>
                        ) : (
                          <>
                            {result.place}
                            <span className="text-sm font-normal text-gray-500 ml-1">
                              {result.place === 1 ? 'st' : 
                               result.place === 2 ? 'nd' : 
                               result.place === 3 ? 'rd' : 'th'}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Team Score</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {result.place === 0 ? '-' : result.teamScore}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function useMyResults(): UseMyResultsReturn {
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMyResults() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: entries } = await supabase
          .from('tournament_entries')
          .select(`
            tournament_id,
            team_players (
              player_id
            ),
            profiles (
              team_name
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'registered');

        if (!entries) return;

        const tournamentsResponse = await loggedFetch(
          `https://api.sportsdata.io/golf/v2/json/Tournaments?key=${API_KEY}`,
          undefined,
          'MyResults:Tournaments'
        );
        if (!tournamentsResponse.ok) throw new Error('Failed to fetch tournaments');
        const tournamentsData = await tournamentsResponse.json();

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const resultsPromises = entries.map(async (entry) => {
          const tournament = tournamentsData.find((t: Tournament) => 
            t.TournamentID === entry.tournament_id
          );
          
          if (!tournament) return null;

          const startDate = new Date(tournament.StartDate);
          const endDate = new Date(tournament.EndDate);
          
          let status: 'upcoming' | 'active' | 'completed' = 'upcoming';
          if (endDate < now) status = 'completed';
          else if (startDate <= now && endDate >= now) status = 'active';
          
          let place = 0;
          let teamScore = 0;
          let winnerBonus = 0;
          let earnings = 0;

          if (status === 'completed' || status === 'active') {
            let playersData: Player[] = [];
            if (status === 'active') {
              const leaderboardData = await getCachedLeaderboard(tournament.TournamentID, 'active') as { Players?: Player[] };
              playersData = leaderboardData.Players || [];
            } else if (status === 'completed') {
              let leaderboardData: { Players?: Player[] };
              try {
                leaderboardData = await getCachedLeaderboard(tournament.TournamentID, 'completed') as { Players?: Player[] };
                playersData = leaderboardData.Players || [];
              } catch {
                // fallback
                const scoresResponse = await loggedFetch(
                  `https://api.sportsdata.io/golf/v2/json/PlayerTournamentRoundScores/${tournament.TournamentID}?key=${API_KEY}`,
                  undefined,
                  'MyResults:PlayerTournamentRoundScores'
                );
                if (scoresResponse.ok) {
                  playersData = await scoresResponse.json();
                }
              }
            }
              
            const { data: teamPlayersData } = await supabase
              .from('team_players')
              .select(`
                player_id,
                tournament_entries!inner(
                  id,
                  tournament_id,
                  profiles (
                    team_name
                  )
                )
              `)
              .eq('tournament_entries.tournament_id', tournament.TournamentID);

            if (!teamPlayersData) return {
              tournament,
              place: 0,
              teamScore: 0,
              status,
              winnerBonus: 0,
              earnings: 0
            };

            const teamScores = new Map<string, number>();
            const teamEntries = new Map<string, string>();

            // Skip if user hasn't created a team yet
            if (entry.team_players.length === 0) {
              return {
                tournament,
                place: 0,
                teamScore: 0,
                status,
                winnerBonus: 0,
                earnings: 0
              };
            }

            for (const tp of entry.team_players) {
              const player = playersData.find((p) => p.PlayerID === tp.player_id);
              if (player) {
                const score = calculatePlayerScore(player, playersData, true);
                teamScore += score;
              }
            }

            for (const tp of teamPlayersData) {
              const player = playersData.find((p) => p.PlayerID === tp.player_id);
              // Defensive: check for correct structure
              const teamEntry = tp.tournament_entries as { id?: string; profiles?: { team_name?: string } } | undefined;
              const teamName = teamEntry?.profiles?.team_name;
              if (player && typeof teamName === 'string' && typeof teamEntry?.id === 'string') {
                const score = calculatePlayerScore(player, playersData, true);
                teamEntries.set(teamName, teamEntry.id);
                teamScores.set(
                  teamName,
                  (teamScores.get(teamName) || 0) + score
                );
              }
            }

            const sortedTeams = Array.from(teamScores.entries())
              .sort((a: [string, number], b: [string, number]) => a[1] - b[1]);

            // If no teams have scores yet, return placeholder result
            if (sortedTeams.length === 0) {
              return {
                tournament,
                place: 0,
                teamScore: 0,
                status,
                winnerBonus: 0,
                earnings: 0
              };
            }

            // Defensive: handle both object and array for profiles
            let userTeamName = '';
            if (entry.profiles && typeof entry.profiles === 'object' && !Array.isArray(entry.profiles)) {
              userTeamName = (entry.profiles as { team_name: string }).team_name;
            } else if (
              Array.isArray(entry.profiles) &&
              entry.profiles.length > 0 &&
              typeof entry.profiles[0] === 'object' &&
              entry.profiles[0] !== null &&
              'team_name' in entry.profiles[0]
            ) {
              userTeamName = (entry.profiles[0] as { team_name: string }).team_name;
            }

            place = sortedTeams.findIndex(([name]) => name === userTeamName) + 1;

            if (status === 'completed') {
              if (place === 1) {
                const strokesAhead = sortedTeams
                  .filter(([name]) => name !== userTeamName)
                  .reduce((sum, [, score]) => sum + (score - teamScore), 0);
                earnings = strokesAhead;
                const tournamentWinner = playersData
                  .sort((a, b) => (a.TotalScore || 0) - (b.TotalScore || 0))[0];
                if (entry.team_players.some(tp => tp.player_id === tournamentWinner.PlayerID)) {
                  const playerRank = entry.team_players
                    .map(tp => playersData.find((p) => p.PlayerID === tp.player_id))
                    .sort((a, b) => (a?.WorldGolfRanking || 999) - (b?.WorldGolfRanking || 999))
                    .findIndex(p => p && p.PlayerID === tournamentWinner.PlayerID);
                  winnerBonus = playerRank === 0 ? 10 : playerRank === 1 ? 20 : 30;
                }
              } else {
                const winner = sortedTeams[0];
                const strokesBehind = teamScores.get(userTeamName)! - teamScores.get(winner[0])!;
                earnings = -strokesBehind;
              }
            }
          }
          // Always return a TournamentResult object
          return {
            tournament,
            place,
            teamScore,
            status,
            winnerBonus,
            earnings
          };
        });
        const validResults = (await Promise.all(resultsPromises)).filter((r: TournamentResult | null): r is TournamentResult => r !== null);
        
        const sortedResults = validResults.sort((a: TournamentResult, b: TournamentResult) => {
          const dateA = new Date(a.tournament.StartDate);
          const dateB = new Date(b.tournament.StartDate);
          return dateA.getTime() - dateB.getTime();
        });

        setResults(sortedResults);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setLoading(false);
      }
    }

    fetchMyResults();
  }, []);

  const completedTournaments = results.filter(r => r.status === 'completed');
  const completedTournamentsWithFullTeam = completedTournaments.filter(r => r.place > 0);
  const stats = {
    totalWins: completedTournaments.filter(r => r.place === 1).length,
    totalBonuses: completedTournaments.reduce((sum, r) => sum + r.winnerBonus, 0),
    averageFinish: completedTournamentsWithFullTeam.length > 0
      ? (completedTournamentsWithFullTeam.reduce((sum, r) => sum + r.place, 0) / completedTournamentsWithFullTeam.length).toFixed(1)
      : 'N/A',
    totalEarnings: completedTournaments.reduce((sum, r) => sum + r.earnings, 0)
  };

  return {
    results,
    loading,
    error,
    stats
  };
}

function formatCurrency(value: number) {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(value)}`;
}