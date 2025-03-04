import React, { useState, useEffect } from 'react';
import { Trophy, Plus } from 'lucide-react';
import { useLeague } from '../contexts/LeagueContext';
import { supabase } from '../lib/supabase';
import { LeagueCard } from '../components/league/LeagueCard';
import { CreateLeagueModal } from '../components/league/CreateLeagueModal';

interface LeagueMemberCounts {
  [key: string]: number;
}

export function Leagues() {
  const { userLeagues, loading, error, createLeague, joinLeague, leaveLeague } = useLeague();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [memberCounts, setMemberCounts] = useState<LeagueMemberCounts>({});
  const [userMemberships, setUserMemberships] = useState<Set<string>>(new Set());
  const [loadingDetails, setLoadingDetails] = useState(true);

  useEffect(() => {
    async function fetchLeagueDetails() {
      try {
        setLoadingDetails(true);
        // Get member counts for all leagues
        const { data: counts } = await supabase
          .from('league_members')
          .select('league_id');

        const countMap: LeagueMemberCounts = {};
        counts?.forEach(count => {
          countMap[count.league_id] = (countMap[count.league_id] || 0) + 1;
        });
        setMemberCounts(countMap);

        // Get user's memberships
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: memberships } = await supabase
            .from('league_members')
            .select('league_id')
            .eq('user_id', user.id);

          setUserMemberships(new Set(memberships?.map(m => m.league_id) || []));
        }
      } catch (err) {
        console.error('Error fetching league details:', err);
      } finally {
        setLoadingDetails(false);
      }
    }

    fetchLeagueDetails();
  }, []);

  if (loading || loadingDetails) {
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

  async function handleCreateLeague(name: string, description: string, isPrivate: boolean) {
    await createLeague(name, description, isPrivate);
  }

  async function handleLeaveLeague(leagueId: string) {
    try {
      await leaveLeague(leagueId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to leave league');
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Leagues</h1>
          <p className="text-xl text-gray-600">
            Join a league or create your own to compete with friends
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Create League</span>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {userLeagues.map((league) => (
          <LeagueCard
            key={league.id}
            league={league}
            memberCount={memberCounts[league.id] || 0}
            isMember={userMemberships.has(league.id)}
            onJoin={() => joinLeague(league.id)}
            onLeave={() => handleLeaveLeague(league.id)}
          />
        ))}
      </div>

      <CreateLeagueModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateLeague}
      />
    </div>
  );
}