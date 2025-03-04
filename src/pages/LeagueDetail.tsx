import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLeague } from '../contexts/LeagueContext';
import { LeagueTournaments } from '../components/league/LeagueTournaments';
import { LeagueMembers } from '../components/league/LeagueMembers';
import type { League, LeagueMember, LeagueTournament } from '../types/league';

export function LeagueDetail() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { setCurrentLeague } = useLeague();
  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [tournaments, setTournaments] = useState<LeagueTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchTournaments() {
    const { data, error } = await supabase
      .from('league_tournaments')
      .select('*, tournament_cache(name, venue, start_date, end_date)')
      .eq('league_id', leagueId);

    if (error) throw error;
    setTournaments(data.map(tournament => ({
      ...tournament,
      tournament: tournament.tournament_cache
    })));
  }

  useEffect(() => {
    async function fetchLeagueDetails() {
      try {
        if (!leagueId) return;

        const { data: leagueData, error: leagueError } = await supabase
          .from('leagues')
          .select('*')
          .eq('id', leagueId)
          .single();

        if (leagueError) throw leagueError;
        setLeague(leagueData);
        setCurrentLeague(leagueData);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userMember } = await supabase
            .from('league_members')
            .select('role')
            .eq('league_id', leagueId)
            .eq('user_id', user.id)
            .single();

          setIsAdmin(userMember?.role === 'owner' || userMember?.role === 'admin');
        }

        const { data: membersData, error: membersError } = await supabase
          .from('league_members')
          .select('*, profiles(team_name, team_color)')
          .eq('league_id', leagueId);

        if (membersError) throw membersError;
        setMembers(membersData.map(member => ({
          ...member,
          profile: member.profiles
        })));

        await fetchTournaments();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load league details');
      } finally {
        setLoading(false);
      }
    }

    fetchLeagueDetails();

    return () => {
      setCurrentLeague(null);
    };
  }, [leagueId, setCurrentLeague]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'League not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link
          to="/leagues"
          className="flex items-center text-green-600 hover:text-green-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Leagues
        </Link>
        <div className="flex items-center space-x-2">
          <Trophy className="h-6 w-6 text-green-600" />
          <span className="text-lg font-semibold text-gray-900">{league.name}</span>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">League Details</h2>
            <div className="space-y-4">
              <p className="text-gray-600">{league.description}</p>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-gray-500" />
                  <span className="text-gray-600">{members.length} members</span>
                </div>
              </div>
            </div>
          </div>

          <LeagueMembers members={members} />
        </div>

        <LeagueTournaments
          leagueId={leagueId}
          tournaments={tournaments}
          isAdmin={isAdmin}
          onTournamentAdded={fetchTournaments}
        />
      </div>
    </div>
  );
}