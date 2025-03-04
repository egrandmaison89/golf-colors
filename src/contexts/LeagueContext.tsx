import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { League, LeagueMember } from '../types/league';

interface LeagueContextType {
  userLeagues: League[];
  currentLeague: League | null;
  leagueMembers: LeagueMember[];
  loading: boolean;
  error: string | null;
  setCurrentLeague: (league: League | null) => void;
  refreshLeagues: () => Promise<void>;
  createLeague: (name: string, description: string, isPrivate: boolean) => Promise<League>;
  joinLeague: (leagueId: string, inviteCode?: string) => Promise<void>;
  leaveLeague: (leagueId: string) => Promise<void>;
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const [userLeagues, setUserLeagues] = useState<League[]>([]);
  const [currentLeague, setCurrentLeague] = useState<League | null>(null);
  const [leagueMembers, setLeagueMembers] = useState<LeagueMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshLeagues();
  }, []);

  useEffect(() => {
    if (currentLeague) {
      fetchLeagueMembers(currentLeague.id);
    } else {
      setLeagueMembers([]);
    }
  }, [currentLeague]);

  async function fetchLeagueMembers(leagueId: string) {
    try {
      const { data, error } = await supabase
        .from('league_members')
        .select('*, profiles(team_name, team_color)')
        .eq('league_id', leagueId);

      if (error) throw error;

      setLeagueMembers(data.map(member => ({
        ...member,
        profile: member.profiles
      })));
    } catch (err) {
      console.error('Error fetching league members:', err);
    }
  }

  async function refreshLeagues() {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberLeagues, error: memberError } = await supabase
        .from('league_members')
        .select('leagues(*)')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const { data: publicLeagues, error: publicError } = await supabase
        .from('leagues')
        .select('*')
        .eq('is_private', false);

      if (publicError) throw publicError;

      const userLeagueIds = new Set(memberLeagues.map(ml => ml.leagues.id));
      const allLeagues = [
        ...memberLeagues.map(ml => ml.leagues),
        ...publicLeagues.filter(pl => !userLeagueIds.has(pl.id))
      ];

      setUserLeagues(allLeagues);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leagues');
    } finally {
      setLoading(false);
    }
  }

  async function createLeague(name: string, description: string, isPrivate: boolean) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('leagues')
        .insert({
          name,
          description,
          is_private: isPrivate,
          owner_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      await refreshLeagues();
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create league');
    }
  }

  async function joinLeague(leagueId: string, inviteCode?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if league exists and is accessible
      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();

      if (leagueError) throw leagueError;

      // Verify invite code for private leagues
      if (league.is_private && league.invite_code !== inviteCode) {
        throw new Error('Invalid invite code');
      }

      // Join the league
      const { error: joinError } = await supabase
        .from('league_members')
        .insert({
          league_id: leagueId,
          user_id: user.id,
          role: 'member'
        });

      if (joinError) throw joinError;

      await refreshLeagues();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to join league');
    }
  }

  async function leaveLeague(leagueId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if user is the owner
      const { data: memberData } = await supabase
        .from('league_members')
        .select('role')
        .eq('league_id', leagueId)
        .eq('user_id', user.id)
        .single();

      if (memberData?.role === 'owner') {
        // Check if there are other owners
        const { data: otherOwners } = await supabase
          .from('league_members')
          .select('id')
          .eq('league_id', leagueId)
          .eq('role', 'owner')
          .neq('user_id', user.id);

        if (!otherOwners?.length) {
          throw new Error('Cannot leave league as the last owner. Transfer ownership first.');
        }
      }

      const { error } = await supabase
        .from('league_members')
        .delete()
        .eq('league_id', leagueId)
        .eq('user_id', user.id);

      if (error) throw error;

      if (currentLeague?.id === leagueId) {
        setCurrentLeague(null);
      }

      await refreshLeagues();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to leave league';
      throw new Error(message);
    }
  }

  const value = {
    userLeagues,
    currentLeague,
    leagueMembers,
    loading,
    error,
    setCurrentLeague,
    refreshLeagues,
    createLeague,
    joinLeague,
    leaveLeague
  };

  return (
    <LeagueContext.Provider value={value}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  const context = useContext(LeagueContext);
  if (context === undefined) {
    throw new Error('useLeague must be used within a LeagueProvider');
  }
  return context;
}