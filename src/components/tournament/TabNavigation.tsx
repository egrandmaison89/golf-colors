import React from 'react';
import { TabButton } from './TabButton';
import { Trophy, Users, PenTool } from 'lucide-react';

interface TabNavigationProps {
  activeTab: 'standings' | 'players' | 'teams' | 'results';
  isFutureTournament: boolean;
  onTabChange: (tab: 'standings' | 'players' | 'teams' | 'results') => void;
}

export function TabNavigation({
  activeTab,
  isFutureTournament,
  onTabChange
}: TabNavigationProps) {
  return (
    <div className="overflow-x-auto pb-2 mb-6 -mx-4 px-4">
      <div className="flex flex-wrap gap-2 min-w-max">
        <TabButton
          active={activeTab === 'standings'} 
          onClick={() => onTabChange('standings')} 
          icon={isFutureTournament ? <PenTool /> : <Trophy />}
          text={isFutureTournament ? 'Draft' : 'Leaderboard'}
          fullText={isFutureTournament ? 'Draft Central' : 'Tournament Leaderboard'}
        />
        <TabButton
          active={activeTab === 'players'}
          onClick={() => onTabChange('players')}
          icon={<Users className="h-5 w-5 text-blue-500" />}
          text="Players"
          fullText="Drafted Players"
        />
        <TabButton
          active={activeTab === 'teams'}
          onClick={() => onTabChange('teams')}
          icon={<Users />}
          text="Teams"
          fullText="Team Leaderboard"
        />
        <TabButton
          active={activeTab === 'results'}
          onClick={() => onTabChange('results')}
          icon={<Trophy />}
          text="Results"
          fullText="Results"
        />
      </div>
    </div>
  );
}