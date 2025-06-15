import React from 'react';
import { Trophy, Users, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { getTournaments, getTournamentResults } from '../lib/tournament-cache';
import type { Tournament, Player } from '../types/tournament';
import golfersData from '../../public/golfers.json';
import { getPlayerStatus, calculatePlayerScore } from '../utils/tournament';

interface LeaderboardEntry {
  player_name: string;
  total_score: number;
  position: number;
}

export function Home() {
  const [recentTournament, setRecentTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [mostRecentCompleted, setMostRecentCompleted] = useState<Tournament | null>(null);
  const [recentWinners, setRecentWinners] = useState<{ team_names: string[], tournament_name: string } | null>(null);
  const [golfersMap, setGolfersMap] = useState<Record<number, { FirstName: string; LastName: string }>>({});
  const [teamStandings, setTeamStandings] = useState<Array<{ team_name: string; team_color: string; total_score: number }>>([]);
  const [userTeamName, setUserTeamName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTournaments() {
      try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const tournaments = await getTournaments();
        
        // Sort tournaments by date
        const sortedTournaments = tournaments.sort((a: Tournament, b: Tournament) => 
          new Date(a.StartDate).getTime() - new Date(b.StartDate).getTime()
        );

        // Find the current tournament
        const activeTournament = sortedTournaments.find(t => {
          const startDate = new Date(t.StartDate);
          const endDate = new Date(t.EndDate);
          return startDate <= now && endDate >= now;
        });
        setCurrentTournament(activeTournament || null);
        
        // Find the most recently completed tournament
        const completedTournaments = sortedTournaments.filter(t => {
          const endDate = new Date(t.EndDate);
          return endDate < now;
        });
        const recentCompleted = completedTournaments[completedTournaments.length - 1];
        setMostRecentCompleted(recentCompleted || null);

        // Determine which tournament to show based on timing
        let tournamentToShow;
        if (activeTournament) {
          // If there's an active tournament, show it
          tournamentToShow = activeTournament;
        } else {
          // Find next tournament
          const nextTournament = sortedTournaments.find(t => {
            const startDate = new Date(t.StartDate);
            return startDate > now;
          });
          
          tournamentToShow = nextTournament || recentCompleted;
        }

        if (tournamentToShow) {
          setRecentTournament(tournamentToShow);
          const resultsData = await getTournamentResults(tournamentToShow.TournamentID);
          
          // Fetch team data for the tournament
          const { data: teamPlayersData } = await supabase
            .from('team_players')
            .select(`
              player_id, 
              tournament_entries!inner (
                tournament_id,
                profiles!inner (
                  team_name
                )
              )
            `)
            .eq('tournament_entries.tournament_id', tournamentToShow.TournamentID);

          if (teamPlayersData) {
            // Calculate team scores
            const teamScores = new Map<string, number>();
            const validTeams = new Set<string>();
            
            (teamPlayersData as Array<{ player_id: number; tournament_entries?: { profiles?: { team_name?: string }[] } }>).forEach(tp => {
              const player = resultsData.find((p: unknown) => typeof p === 'object' && p !== null && 'PlayerID' in p && (p as Player).PlayerID === tp.player_id) as Player | undefined;
              let teamName: string | undefined;
              if (tp.tournament_entries && tp.tournament_entries.profiles) {
                if (Array.isArray(tp.tournament_entries.profiles)) {
                  teamName = tp.tournament_entries.profiles[0]?.team_name;
                } else {
                  teamName = (tp.tournament_entries.profiles as { team_name?: string })?.team_name;
                }
              }
              if (player && teamName) {
                // Use correct cut logic for team leaderboard
                const safePlayer: Player = {
                  PlayerID: player.PlayerID,
                  FirstName: player.FirstName ?? '',
                  LastName: player.LastName ?? '',
                  TotalScore: player.TotalScore ?? 0,
                  IsWithdrawn: player.IsWithdrawn ?? false,
                  TotalStrokes: player.TotalStrokes ?? 0,
                  Par: player.Par ?? 0,
                  PlayerRoundScore: player.PlayerRoundScore ?? [],
                };
                const score = getPlayerStatus(player) === 'cut'
                  ? calculatePlayerScore(safePlayer, resultsData, true)
                  : player.TotalScore ?? 0;
                validTeams.add(teamName);
                teamScores.set(
                  teamName,
                  (teamScores.get(teamName) || 0) + score
                );
              }
            });

            // Find winning team
            if (validTeams.size > 0) {
              const sortedTeams = Array.from(teamScores.entries())
                .filter(([teamName]) => validTeams.has(teamName));
              
              if (sortedTeams.length > 0) {
                // Removed setWinningTeam as it is unused
              }
            }
          }
          
          if (resultsData) {
            // Process and sort leaderboard
            const processedLeaderboard = (resultsData as Player[])
              .filter((p) => p.TotalScore !== null)
              .map((p) => {
                let FirstName = p.FirstName ?? '';
                let LastName = p.LastName ?? '';
                if (!FirstName || !LastName) {
                  if ('Name' in p && typeof (p as { Name?: string }).Name === 'string') {
                    const parts = (p as { Name: string }).Name.split(' ');
                    FirstName = FirstName || parts[0];
                    LastName = LastName || parts.slice(1).join(' ');
                  } else if (golfersMap[p.PlayerID]) {
                    FirstName = golfersMap[p.PlayerID].FirstName;
                    LastName = golfersMap[p.PlayerID].LastName;
                  }
                }
                return {
                  player_name: `${FirstName} ${LastName}`.trim(),
                  total_score: p.TotalScore as number,
                  position: 0 // will be set after sorting
                };
              })
              .sort((a, b) => a.total_score - b.total_score)
              .slice(0, 6)
              .map((p, index: number) => ({
                ...p,
                position: index + 1
              }));
            
            setLeaderboard(processedLeaderboard);
          }

          // If we have a completed tournament that ended less than 7 days ago,
          // show its winner in the congratulations section
          if (mostRecentCompleted) {
            const endDate = new Date(mostRecentCompleted.EndDate);
            const sevenDaysAfterEnd = new Date(endDate);
            sevenDaysAfterEnd.setDate(sevenDaysAfterEnd.getDate() + 7);
            
            if (now < sevenDaysAfterEnd) {
              const completedResultsData = await getTournamentResults(mostRecentCompleted.TournamentID);
              const { data: completedTeamPlayers } = await supabase
                .from('team_players')
                .select(`
                  player_id,
                  tournament_entries!inner(
                    tournament_id,
                    profiles(team_name)
                  )
                `)
                .eq('tournament_entries.tournament_id', mostRecentCompleted.TournamentID);

              if (completedTeamPlayers && completedResultsData) {
                // Calculate winning team for completed tournament
                const teamScores = new Map<string, number>();
                
                (completedTeamPlayers as Array<{ player_id: number; tournament_entries?: { profiles?: { team_name?: string }[] } }>).forEach(tp => {
                  const player = completedResultsData.find((p: unknown) => typeof p === 'object' && p !== null && 'PlayerID' in p && (p as Player).PlayerID === tp.player_id) as Player | undefined;
                  let teamName: string | undefined;
                  if (tp.tournament_entries && tp.tournament_entries.profiles) {
                    if (Array.isArray(tp.tournament_entries.profiles)) {
                      teamName = tp.tournament_entries.profiles[0]?.team_name;
                    } else {
                      teamName = (tp.tournament_entries.profiles as { team_name?: string })?.team_name;
                    }
                  }
                  if (player && teamName) {
                    const safePlayer: Player = {
                      PlayerID: player.PlayerID,
                      FirstName: player.FirstName ?? '',
                      LastName: player.LastName ?? '',
                      TotalScore: player.TotalScore ?? 0,
                      IsWithdrawn: player.IsWithdrawn ?? false,
                      TotalStrokes: player.TotalStrokes ?? 0,
                      Par: player.Par ?? 0,
                      PlayerRoundScore: player.PlayerRoundScore ?? [],
                    };
                    const score = getPlayerStatus(player) === 'cut'
                      ? calculatePlayerScore(safePlayer, completedResultsData, true)
                      : player.TotalScore ?? 0;
                    teamScores.set(
                      teamName,
                      (teamScores.get(teamName) || 0) + score
                    );
                  }
                });

                if (teamScores.size > 0) {
                  // Removed setWinningTeam as it is unused
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching tournament data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTournaments();
  }, []);

  useEffect(() => {
    async function fetchRecentWinners() {
      // 1. Get the most recent completed tournament with >1 unique team
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('*')
        .order('EndDate', { ascending: false });
      if (!tournaments) return;

      for (const tournament of tournaments) {
        // Get all results for this tournament
        const { data: results } = await supabase
          .from('tournament_results')
          .select('team_name, total_score')
          .eq('tournament_id', tournament.TournamentID);

        if (results && results.length > 1) {
          // Find all unique teams
          const uniqueTeams = Array.from(new Set(results.map(r => r.team_name)));
          if (uniqueTeams.length > 1) {
            // Find the lowest score
            const lowest = Math.min(...results.map(r => r.total_score));
            // Find all teams with the lowest score (ties)
            const winningTeams = results.filter(r => r.total_score === lowest).map(r => r.team_name);
            setRecentWinners({
              team_names: winningTeams,
              tournament_name: tournament.Name,
            });
            break;
          }
        }
      }
    }
    fetchRecentWinners();
  }, []);

  useEffect(() => {
    setGolfersMap(() => {
      const map: Record<number, { FirstName: string; LastName: string }> = {};
      for (const g of golfersData) {
        map[g.PlayerID] = { FirstName: g.FirstName, LastName: g.LastName };
      }
      return map;
    });
  }, []);

  useEffect(() => {
    async function fetchTeamStandings() {
      if (!currentTournament) return;
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      let userTeam: string | null = null;
      // Fetch all registered teams for the current tournament
      const { data: entries } = await supabase
        .from('tournament_entries')
        .select('user_id, profiles!inner(team_name, team_color)')
        .eq('tournament_id', currentTournament.TournamentID)
        .eq('status', 'registered');
      // Build unique teams
      const teamsMap = new Map<string, { team_color: string; user_ids: string[] }>();
      if (entries) {
        for (const entry of entries) {
          const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
          if (!profile?.team_name) continue;
          if (!teamsMap.has(profile.team_name)) {
            teamsMap.set(profile.team_name, { team_color: profile.team_color || '#3b82f6', user_ids: [] });
          }
          teamsMap.get(profile.team_name)!.user_ids.push(entry.user_id);
          if (user && entry.user_id === user.id) {
            userTeam = profile.team_name;
          }
        }
      }
      // Fetch teamPlayers and results for score calculation
      const resultsData = await getTournamentResults(currentTournament.TournamentID);
      const { data: teamPlayersData } = await supabase
        .from('team_players')
        .select('player_id, tournament_entries!inner(profiles(team_name, team_color))')
        .eq('tournament_entries.tournament_id', currentTournament.TournamentID);
      // Build a map of team_name -> { team_color, player_ids }
      const teamMap = new Map<string, { team_color: string; player_ids: number[] }>();
      if (teamPlayersData) {
        (teamPlayersData as Array<{ player_id: number; tournament_entries?: { profiles?: { team_name?: string; team_color?: string }[] } }>).forEach(tp => {
          let teamName: string | undefined;
          let teamColor: string | undefined;
          if (tp.tournament_entries && tp.tournament_entries.profiles) {
            if (Array.isArray(tp.tournament_entries.profiles)) {
              teamName = tp.tournament_entries.profiles[0]?.team_name;
              teamColor = tp.tournament_entries.profiles[0]?.team_color;
            } else {
              teamName = (tp.tournament_entries.profiles as { team_name?: string })?.team_name;
              teamColor = (tp.tournament_entries.profiles as { team_color?: string })?.team_color;
            }
          }
          if (teamName) {
            if (!teamMap.has(teamName)) {
              teamMap.set(teamName, { team_color: teamColor || '#3b82f6', player_ids: [] });
            }
            teamMap.get(teamName)!.player_ids.push(tp.player_id);
          }
        });
      }
      // Calculate team scores using all drafted players (including MC/WD)
      const teamScores = new Map<string, number>();
      for (const [teamName, { player_ids }] of teamMap.entries()) {
        let total = 0;
        for (const pid of player_ids) {
          const player = resultsData.find((p: unknown) => typeof p === 'object' && p !== null && 'PlayerID' in p && (p as Player).PlayerID === pid) as Player | undefined;
          if (player) {
            const safePlayer: Player = {
              PlayerID: player.PlayerID,
              FirstName: player.FirstName ?? '',
              LastName: player.LastName ?? '',
              TotalScore: player.TotalScore ?? 0,
              IsWithdrawn: player.IsWithdrawn ?? false,
              TotalStrokes: player.TotalStrokes ?? 0,
              Par: player.Par ?? 0,
              PlayerRoundScore: player.PlayerRoundScore ?? [],
            };
            total += calculatePlayerScore(safePlayer, resultsData, true);
          }
        }
        teamScores.set(teamName, total);
      }
      // Build standings array
      const standings = Array.from(teamMap.entries()).map(([team_name, { team_color }]) => ({
        team_name,
        team_color,
        total_score: teamScores.get(team_name) ?? 0
      }));
      standings.sort((a, b) => a.total_score - b.total_score);
      setTeamStandings(standings);
      setUserTeamName(userTeam);
    }
    fetchTeamStandings();
  }, [currentTournament]);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6 mt-10">
          Fantasy Golf Like Never Before
        </h1>
        <p className="text-xl text-gray-600 mb-4 max-w-4xl mx-auto">
          Join the Colors Cup - where strategy meets golf. Draft your dream team,
          compete for real prizes, and experience the thrill of PGA tournaments in a whole new way.
        </p>
        <Link to="/tournaments" className="inline-flex items-center space-x-2 bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors">
          <span>View Tournaments</span>
          <ArrowRight className="h-5 w-5" />
        </Link>
      </section>

      {/* Tournament Name Full Width Heading */}
      {!loading && recentTournament && (
        <div className="max-w-6xl mx-auto mb-2">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">{recentTournament.Name}</h2>
        </div>
      )}

      {/* Results & Team Standings Side-by-Side on Desktop */}
      <div className="flex flex-col md:flex-row md:space-x-8 space-y-8 md:space-y-0 max-w-6xl mx-auto">
        {/* Player Leaderboard */}
        {!loading && recentTournament && (
          <section className="flex-1 bg-white rounded-2xl shadow-xl p-4 border border-gray-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {currentTournament && recentTournament.TournamentID === currentTournament.TournamentID
                    ? 'Tournament Results'
                    : 'Tournament Results'}
                </h2>
                <Link
                  to={`/tournament/${recentTournament.TournamentID}`}
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  View Full Results
                </Link>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="space-y-3">
                  {leaderboard.map((entry) => (
                    <div
                      key={entry.player_name}
                      className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                          entry.position === 1 ? 'bg-yellow-100 text-yellow-700' :
                          entry.position === 2 ? 'bg-gray-100 text-gray-700' :
                          entry.position === 3 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {entry.position}
                        </div>
                        <span className="font-medium text-gray-900">{entry.player_name}</span>
                      </div>
                      <span className={`font-bold ${
                        entry.total_score <= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {entry.total_score > 0 ? `+${entry.total_score}` : entry.total_score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
        {/* Team Standings Leaderboard */}
        {!loading && currentTournament && teamStandings.length > 0 && (
          <section className="flex-1 bg-white rounded-2xl shadow-xl p-4 border border-gray-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Team Standings</h2>
                <Link
                  to={`/tournament/${currentTournament.TournamentID}?tab=teams`}
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  View Full Results
                </Link>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="space-y-3">
                  {teamStandings.slice(0, 6).map((team, idx) => (
                    <div
                      key={team.team_name}
                      className={`flex items-center justify-between bg-white p-3 rounded-lg shadow-sm ${userTeamName === team.team_name ? 'ring-2 ring-green-400' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                          idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                          idx === 1 ? 'bg-gray-100 text-gray-700' :
                          idx === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {idx + 1}
                        </div>
                        <span className="w-3 h-3 rounded-full inline-block border border-white shadow" style={{ backgroundColor: team.team_color || '#3b82f6' }} />
                        <span className="font-medium text-gray-900">{team.team_name}</span>
                        {userTeamName === team.team_name && (
                          <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold">You</span>
                        )}
                      </div>
                      <span className="font-bold text-green-700">{team.total_score > 0 ? `+${team.total_score}` : team.total_score}</span>
                    </div>
                  ))}
                  {/* Show user's team if not in top 6 */}
                  {userTeamName && !teamStandings.slice(0, 6).some(t => t.team_name === userTeamName) && (
                    (() => {
                      const userTeam = teamStandings.find(t => t.team_name === userTeamName);
                      if (!userTeam) return null;
                      return (
                        <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm ring-2 ring-green-400 mt-2">
                          <div className="flex items-center space-x-3">
                            <span className="w-8 h-8 rounded-full flex items-center justify-center font-semibold bg-green-100 text-green-700">{teamStandings.findIndex(t => t.team_name === userTeamName) + 1}</span>
                            <span className="w-3 h-3 rounded-full inline-block border border-white shadow" style={{ backgroundColor: userTeam.team_color || '#3b82f6' }} />
                            <span className="font-medium text-gray-900">{userTeam.team_name}</span>
                            <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold">You</span>
                          </div>
                          <span className="font-bold text-green-700">{userTeam.total_score > 0 ? `+${userTeam.total_score}` : userTeam.total_score}</span>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Winner Callout */}
      {!loading && recentWinners && (
        <section className="bg-gray-100 rounded-2xl shadow-xl p-4 max-w-6xl mx-auto border border-gray-200 mb-4">
            <div className="flex items-center space-x-4">
              <Trophy className="h-12 w-12 text-yellow-500" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                Congratulations to {recentWinners.team_names.join(' & ')}!
                </h2>
                <p className="text-gray-600">
                Winner{recentWinners.team_names.length > 1 ? 's' : ''} of the {recentWinners.tournament_name}.
                </p>
              </div>
            </div>
        </section>
      )}

      {/* Features Grid */}
      <section className="grid md:grid-cols-3 gap-6">
        <FeatureCard
          icon={<Trophy className="h-8 w-8 text-green-600" />}
          title="Weekly Tournaments"
          description="New tournaments every week with exciting prizes and competitive gameplay."
          bg=" bg-gray-100 border-gray-200"
        />
        <FeatureCard
          icon={<Users className="h-8 w-8 text-blue-600" />}
          title="Team Strategy"
          description="Draft three players per tournament. Choose wisely – each stroke counts!"
          bg=" bg-gray-100 border-gray-200"
        />
        <FeatureCard
          icon={<Sparkles className="h-8 w-8 text-yellow-600" />}
          title="Real Prizes"
          description="Compete for cash prizes based on your team's performance."
          bg="bg-gray-100 border-gray-200"
        />
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description, bg }: { icon: React.ReactNode; title: string; description: string; bg: string }) {
  return (
    <div className={`rounded-xl shadow-lg p-5 text-center border ${bg}`}>
      <div className="inline-block p-3 bg-gray-100 rounded-full mb-3 border border-gray-200">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}