import React from 'react';
import { Crown, Shield, User } from 'lucide-react';
import type { LeagueMember } from '../../types/league';

interface LeagueMembersProps {
  members: LeagueMember[];
}

export function LeagueMembers({ members }: LeagueMembersProps) {
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">League Members</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {sortedMembers.map((member) => (
          <div key={member.id} className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {member.role === 'owner' ? (
                <Crown className="h-5 w-5 text-yellow-500" />
              ) : member.role === 'admin' ? (
                <Shield className="h-5 w-5 text-blue-500" />
              ) : (
                <User className="h-5 w-5 text-gray-500" />
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: member.profile?.team_color?.toLowerCase() || 'blue' }}
                  />
                  <span className="font-medium text-gray-900">
                    {member.profile?.team_name || 'Unknown Team'}
                  </span>
                </div>
                <span className="text-sm text-gray-500 capitalize">{member.role}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}