import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ProposeBetForm } from '../components/side_bets/ProposeBetForm';
import { BetList } from '../components/side_bets/BetList';
import { useLocation } from 'react-router-dom';

export default function SideBets() {
  const [user, setUser] = useState<any>(null);
  const [refresh, setRefresh] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Scroll to bet if betId is in query string
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const betId = params.get('betId');
    if (betId) {
      setTimeout(() => {
        const el = document.getElementById(`side-bet-${betId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [location.search, refresh]);

  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-6">Side Bets</h1>
      <p className="mb-8 text-gray-700">Propose, accept, and view side bets between users. All bets are public and visible to all visitors.</p>
      {user && (
        <div className="mb-6">
          <button
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors font-semibold shadow"
            onClick={() => setShowForm(true)}
          >
            Propose Side Bet
          </button>
        </div>
      )}
      {showForm && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-bold"
              onClick={() => setShowForm(false)}
              aria-label="Close"
            >
              ×
            </button>
            <ProposeBetForm
              onBetProposed={() => {
                setShowForm(false);
                setRefresh(r => r + 1);
              }}
              currentUserId={user.id}
            />
          </div>
        </div>
      )}
      <BetList key={refresh} currentUser={user} />
    </div>
  );
} 