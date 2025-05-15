import React from 'react';
import { Trophy, Users, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { getTournaments, getTournamentResults } from '../lib/tournament-cache';
import type { Tournament } from '../types/tournament';

interface LeaderboardEntry {
  player_name: string;
  total_score: number;
  position: number;
}

interface WinningTeam {
  team_name: string;
  total_score: number;
}

export function Home() {
  const [recentTournament, setRecentTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [winningTeam, setWinningTeam] = useState<WinningTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [mostRecentCompleted, setMostRecentCompleted] = useState<Tournament | null>(null);
  const [recentWinners, setRecentWinners] = useState<{ team_names: string[], tournament_name: string } | null>(null);

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
            
            teamPlayersData.forEach(tp => {
              const player = resultsData.find((p: any) => p.PlayerID === tp.player_id);
              if (player && tp.tournament_entries?.profiles?.team_name) {
                const teamName = tp.tournament_entries.profiles.team_name;
                const score = player.TotalScore ?? ((player.TotalStrokes * 2) - (player.Par * 4));
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
                setWinningTeam({
                  team_name: sortedTeams[0][0],
                  total_score: sortedTeams[0][1]
                });
              }
            }
          }
          
          if (resultsData) {
            // Process and sort leaderboard
            const processedLeaderboard = resultsData
              .filter((p: any) => p.TotalScore !== null)
              .sort((a: any, b: any) => a.TotalScore - b.TotalScore)
              .slice(0, 5)
              .map((p: any, index: number) => ({
                player_name: `${p.FirstName} ${p.LastName}`,
                total_score: p.TotalScore,
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
                
                completedTeamPlayers.forEach(tp => {
                  const player = completedResultsData.find((p: any) => p.PlayerID === tp.player_id);
                  if (player) {
                    const teamName = tp.tournament_entries.profiles.team_name;
                    const score = player.TotalScore ?? ((player.TotalStrokes * 2) - (player.Par * 4));
                    teamScores.set(
                      teamName,
                      (teamScores.get(teamName) || 0) + score
                    );
                  }
                });

                if (teamScores.size > 0) {
                  const sortedTeams = Array.from(teamScores.entries())
                    .sort(([, a], [, b]) => a - b);
                  
                  setWinningTeam({
                    team_name: sortedTeams[0][0],
                    total_score: sortedTeams[0][1],
                    tournament_name: mostRecentCompleted.Name
                  });
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

      {/* Recent Tournament Section */}
      {!loading && recentTournament && (
        <section className="bg-white rounded-2xl shadow-xl p-4 max-w-2xl mx-auto border border-gray-200">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Recent Tournament Results
              </h2>
              <Link
                to={`/tournament/${recentTournament.TournamentID}`}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                View Full Results
              </Link>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                {recentTournament.Name}
              </h3>
              
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