import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ProposeBetForm } from '../components/side_bets/ProposeBetForm';
import { BetList } from '../components/side_bets/BetList';

export default function SideBets() {
  const [user, setUser] = useState<any>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-6">Side Bets</h1>
      <p className="mb-8 text-gray-700">Propose, accept, and view side bets between users. All bets are public and visible to all visitors.</p>
      {user && (
        <ProposeBetForm onBetProposed={() => setRefresh(r => r + 1)} currentUserId={user.id} />
      )}
      <BetList key={refresh} currentUser={user} />
    </div>
  );
} 