import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Users as UsersIcon } from 'lucide-react';
import { Tournament } from '../types/tournament';
import { getTournaments } from '../lib/tournament-cache';
import { supabase } from '../lib/supabase';

interface TournamentEntry {
  user_id: string;
  profile: {
    team_name: string;
  };
}

export function Tournaments() {
  // const navigate = useNavigate(); // Removed unused variable
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<number, TournamentEntry[]>>({});
  // TODO: Specify a better type than 'any' for user
  const [user, setUser] = useState<any>(null);

  const fetchTournamentEntries = useCallback(async () => {
    const { data: entriesData } = await supabase
      .from('tournament_entries')
      .select('tournament_id, user_id, profiles!inner(team_name)')
      .eq('status', 'registered')
      .order('created_at', { ascending: true });

    if (entriesData) {
      // Create a map to track unique teams per tournament
      const uniqueTeams = new Map<number, Set<string>>();
      const entriesByTournament: Record<number, TournamentEntry[]> = {};
      
      // Process entries in order, keeping only the first entry for each team per tournament
      entriesData.forEach(entry => {
        const tournamentId = entry.tournament_id;
        // If profiles is an array, use entry.profiles[0]?.team_name
        // If it's an object, use entry.profile?.team_name
        const teamName = Array.isArray(entry.profiles) ? entry.profiles[0]?.team_name : entry.profiles?.team_name;
        
        if (!teamName) return;
        
        // Initialize tournament entries if needed
        if (!entriesByTournament[tournamentId]) {
          entriesByTournament[tournamentId] = [];
          uniqueTeams.set(tournamentId, new Set());
        }
        
        // Check if we've already seen this team in this tournament
        const uniqueTeamsForTournament = uniqueTeams.get(tournamentId)!;
        if (!uniqueTeamsForTournament.has(teamName)) {
          uniqueTeamsForTournament.add(teamName);
          entriesByTournament[tournamentId].push({
            user_id: entry.user_id,
            profile: { team_name: teamName }
          });
        }
      });
      setEntries(entriesByTournament);
    }
  }, []);

  useEffect(() => {
    // Get initial auth state
    supabase.auth.getUser().then(userData => {
      setUser(userData);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function fetchTournaments() {
      try {
        const tournaments2025 = await getTournaments();
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        // Sort tournaments by status and date
        const sortedTournaments = tournaments2025.sort((a: Tournament, b: Tournament) => {
          const aStartDate = new Date(a.StartDate);
          const aEndDate = new Date(a.EndDate);
          const bStartDate = new Date(b.StartDate);
          const bEndDate = new Date(b.EndDate);
          // Check if tournaments are active
          const aIsActive = aStartDate <= now && aEndDate >= now;
          const bIsActive = bStartDate <= now && bEndDate >= now;
          if (aIsActive && !bIsActive) return -1;
          if (!aIsActive && bIsActive) return 1;
          // If neither is active, check if they're upcoming
          const aIsUpcoming = aStartDate > now;
          const bIsUpcoming = bStartDate > now;
          if (aIsUpcoming && !bIsUpcoming) return -1;
          if (!aIsUpcoming && bIsUpcoming) return 1;
          // If both are in the same category (upcoming or completed)
          // Sort by start date
          return aStartDate.getTime() - bStartDate.getTime();
        });
        setTournaments(sortedTournaments);
        await fetchTournamentEntries();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tournaments');
      } finally {
        setLoading(false);
      }
    }
    fetchTournaments();
  }, [user]);

  async function handleRegister(tournamentId: number) {
    if (!user?.user) return;

    // Check if profile exists and create if needed
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.user.id)
      .single();

    if (!profile) {
      // Create profile if it doesn't exist
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.user.id,
          team_name: user.user.user_metadata?.team_name || 'Unknown Team',
          team_color: user.user.user_metadata?.team_color || 'Blue'
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        alert('Error creating profile. Please try again.');
        return;
      }
    }

    const tournament = tournaments.find(t => t.TournamentID === tournamentId);
    if (!tournament) return;

    const now = new Date();
    const startDate = new Date(tournament.StartDate);
    
    if (startDate <= now) {
      alert('Registration is closed. This tournament has already started.');
      return;
    }

    try {
      const { error } = await supabase
        .from('tournament_entries')
        .insert({
          tournament_id: tournamentId,
          user_id: user.user.id,
          status: 'registered'
        });

      if (error) throw error;
      await fetchTournamentEntries();
    } catch (err) {
      console.error('Error registering for tournament:', err);
    }
  }

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
      <div className="text-center">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            2025 PGA Tournaments
          </h1>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Group tournaments by status */}
        {(() => {
          const now = new Date();
          now.setHours(0, 0, 0, 0);

          const activeTournaments = tournaments.filter(t => {
            const startDate = new Date(t.StartDate);
            const endDate = new Date(t.EndDate);
            return startDate <= now && endDate >= now;
          });

          const upcomingTournaments = tournaments.filter(t => {
            const startDate = new Date(t.StartDate);
            return startDate > now;
          });

          const completedTournaments = tournaments.filter(t => {
            const endDate = new Date(t.EndDate);
            return endDate < now;
          });

          return (
            <>
              {/* Active Tournaments */}
              {activeTournaments.length > 0 && (
                <>
                  <div className="col-span-full">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center border-b border-gray-200 pb-4">
                      <Trophy className="h-6 w-6 text-green-600 mr-2" />
                      Active Tournaments
                    </h2>
                  </div>
                  <div className="grid gap-6">
                    {activeTournaments.map(tournament => (
                      <TournamentCard
                        key={tournament.TournamentID}
                        tournament={tournament}
                        user={user}
                        entries={entries}
                        onRegister={handleRegister}
                        fetchTournamentEntries={fetchTournamentEntries}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Upcoming Tournaments */}
              {upcomingTournaments.length > 0 && (
                <>
                  <div className="col-span-full mt-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center border-b border-gray-200 pb-4">
                      <Trophy className="h-6 w-6 text-blue-500 mr-2" />
                      Upcoming Tournaments
                    </h2>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {upcomingTournaments.map(tournament => (
                      <TournamentCard
                        key={tournament.TournamentID}
                        tournament={tournament}
                        user={user}
                        entries={entries}
                        onRegister={handleRegister}
                        fetchTournamentEntries={fetchTournamentEntries}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Completed Tournaments */}
              {completedTournaments.length > 0 && (
                <>
                  <div className="col-span-full mt-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center border-b border-gray-200 pb-4">
                      <Trophy className="h-6 w-6 text-gray-400 mr-2" />
                      Completed Tournaments
                    </h2>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {completedTournaments.map(tournament => (
                      <TournamentCard
                        key={tournament.TournamentID}
                        tournament={tournament}
                        user={user}
                        entries={entries}
                        onRegister={handleRegister}
                        fetchTournamentEntries={fetchTournamentEntries}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

function TournamentCard({
  tournament,
  user,
  entries,
  onRegister,
  fetchTournamentEntries
}: {
  tournament: Tournament;
  // TODO: Specify a better type than 'any' for user
  user: any;
  entries: Record<number, TournamentEntry[]>;
  onRegister: (tournamentId: number) => void;
  fetchTournamentEntries: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [showTeams, setShowTeams] = useState(false);
  const [unregistering, setUnregistering] = useState(false);
  const startDate = new Date(tournament.StartDate);
  const endDate = new Date(tournament.EndDate);
  const now = new Date();
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  now.setHours(0, 0, 0, 0);
  const isPast = endDate < now;
  const isActive = startDate <= now && endDate >= now;
  const isFuture = startDate > now;
  const tournamentEntries = entries[tournament.TournamentID] || [];
  const isRegistered = user?.user && tournamentEntries.some(
    entry => entry.user_id === user.user?.id
  );
  const statusClasses = isPast
    ? 'bg-gray-100 hover:bg-gray-50'
    : isActive
    ? 'bg-green-50 hover:bg-green-100 ring-2 ring-green-500'
    : 'bg-white hover:bg-gray-50';

  async function handleUnregister(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setUnregistering(true);
    try {
      const { error } = await supabase
        .from('tournament_entries')
        .delete()
        .match({ tournament_id: tournament.TournamentID, user_id: user.user.id });
      if (error) throw error;
      await fetchTournamentEntries();
    } catch {
      alert('Error unregistering. Please try again.');
    } finally {
      setUnregistering(false);
    }
  }

  return (
    <Link
      to={`/tournament/${tournament.TournamentID}`}
      className={`block rounded-xl shadow-lg hover:shadow-xl transition-all overflow-hidden ${statusClasses}`}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Trophy className={`h-6 w-6 ${isPast ? 'text-gray-400' : isActive ? 'text-green-600' : 'text-blue-500'}`} />
            <span className={`text-sm font-medium px-2 py-1 rounded-full ${
              isPast
                ? 'bg-gray-200 text-gray-600'
                : isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {isPast ? 'Completed' : isActive ? 'Active' : 'Upcoming'}
            </span>
          </div>
        </div>
        
        <h2 className={`text-xl font-semibold mb-2 ${isPast ? 'text-gray-600' : 'text-gray-900'}`}>
          {tournament.Name}
        </h2>
        
        <div className="space-y-2">
          <p className={`text-sm ${isPast ? 'text-gray-500' : 'text-gray-600'}`}>
            <span className="font-medium">Dates:</span>{' '}
            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </p>
          <p className={`text-sm ${isPast ? 'text-gray-500' : 'text-gray-600'}`}>
            <span className="font-medium">Venue:</span> {tournament.Venue}
          </p>
          <p className={`text-sm ${isPast ? 'text-gray-500' : 'text-gray-600'}`}>
            <span className="font-medium">Location:</span> {tournament.Location}
          </p>
        </div>
        
        {isFuture && user?.user && (
          <div className="pt-4 border-t border-gray-200">
            {isRegistered ? (
              <div className="flex items-center justify-between">
                <span className="text-green-600 font-medium">You're registered!</span>
                <div className="flex gap-2">
                  <button
                    className="text-sm bg-green-100 text-green-600 px-3 py-1 rounded-lg hover:bg-green-200 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/tournament/${tournament.TournamentID}`);
                    }}
                  >
                    Manage Team
                  </button>
                  <button
                    onClick={handleUnregister}
                    className="text-sm bg-red-100 text-red-600 px-3 py-1 rounded-lg hover:bg-red-200 transition-colors cursor-pointer"
                    disabled={unregistering}
                  >
                    {unregistering ? 'Unregistering...' : 'Unregister'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRegister(tournament.TournamentID);
                }}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                Register for Tournament
              </button>
            )}
          </div>
        )}
        
        {tournamentEntries.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowTeams(!showTeams);
              }}
              className="flex items-center space-x-2 text-gray-600 w-full hover:text-gray-900 transition-colors"
            >
              <UsersIcon className="h-5 w-5" />
              <span className="font-medium">Registered Teams ({tournamentEntries.length})</span>
            </button>
            {showTeams && (
              <div className="space-y-2 mt-3">
                {tournamentEntries.map((entry) => (
                  entry.profile?.team_name && (
                    <div
                      key={entry.user_id}
                      className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg"
                    >
                      {entry.profile.team_name}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}