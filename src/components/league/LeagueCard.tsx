import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Lock, Globe } from 'lucide-react';
import type { League, LeagueMember } from '../../types/league';

interface LeagueCardProps {
  league: League;
  memberCount: number;
  onJoin?: () => void;
  onLeave?: () => void;
  isMember: boolean;
}

export function LeagueCard({ league, memberCount, onJoin, onLeave, isMember }: LeagueCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-xl font-semibold text-gray-900">{league.name}</h3>
            {league.is_private ? (
              <Lock className="h-4 w-4 text-gray-500" />
            ) : (
              <Globe className="h-4 w-4 text-gray-500" />
            )}
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Users className="h-5 w-5" />
            <span>{memberCount} members</span>
          </div>
        </div>

        {league.description && (
          <p className="text-gray-600 mb-6">{league.description}</p>
        )}

        <div className="flex items-center justify-between">
          <Link
            to={`/leagues/${league.id}`}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            View League
          </Link>

          {isMember ? (
            <button
              onClick={onLeave}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Leave League
            </button>
          ) : (
            <button
              onClick={onJoin}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Join League
            </button>
          )}
        </div>
      </div>
    </div>
  );
}