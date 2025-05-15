import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { BetItem } from './BetItem';
import { CounterModal } from './CounterModal';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface BetListProps {
  currentUser?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

type BetFilter = 'all' | 'proposed' | 'agreed';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BetList({ currentUser }: BetListProps) {
  const [bets, setBets] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BetFilter>('all');
  const [showCounter, setShowCounter] = useState(false);
  const [counterBet, setCounterBet] = useState<any>(null);
  const [expandedRejected, setExpandedRejected] = useState<string[]>([]);

  useEffect(() => {
    async function fetchBets() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('side_bets')
        .select(`*, proposer:proposer_id(team_name), accepter:accepter_id(team_name), opponent:opponent_id(team_name)`) // get names
        .order('created_at', { ascending: false });
      if (error) setError(error.message);
      else setBets(data || []);
      setLoading(false);
    }
    fetchBets();
  }, []);

  const handleAccept = async (betId: string) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase.from('side_bets').update({
        status: 'accepted',
        accepter_id: currentUser.id
      }).eq('id', betId);
      if (error) throw error;
      setBets(bets => bets.map(b => b.id === betId ? { ...b, status: 'accepted', accepter_id: currentUser.id } : b));
    } catch {
      setError('Failed to accept bet');
    }
  };
  const handleReject = async (betId: string) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase.from('side_bets').update({
        status: 'rejected'
      }).eq('id', betId);
      if (error) throw error;
      setBets(bets => bets.map(b => b.id === betId ? { ...b, status: 'rejected' } : b));
    } catch {
      setError('Failed to reject bet');
    }
  };
  function handleCounter(bet: any) {
    setCounterBet(bet);
    setShowCounter(true);
  }
  const handleDelete = async (betId: string) => {
    try {
      await supabase.from('side_bets').delete().eq('id', betId);
      setBets(bets => bets.filter(b => b.id !== betId));
    } catch {
      setError('Failed to delete bet');
    }
  };
  const handleEdit = async (betId: string, updated: { description: string; amount: number; odds: string; opponentId: string }) => {
    try {
      await supabase.from('side_bets').update({
        description: updated.description,
        amount: updated.amount,
        odds: updated.odds
        // opponent_id: updated.opponentId // Uncomment if you want to allow changing opponent
      }).eq('id', betId);
      setBets(bets => bets.map(b => b.id === betId ? { ...b, ...updated } : b));
    } catch {
      // ignore
    }
  };

  // Filtering logic
  const proposedBets = bets.filter(bet => bet.status === 'proposed');
  const agreedBets = bets.filter(bet => bet.status === 'accepted');
  const rejectedBets = bets.filter(bet => bet.status === 'rejected');
  const filteredBets =
    filter === 'all' ? bets.filter(bet => bet.status !== 'rejected') : filter === 'proposed' ? proposedBets : agreedBets;

  // Permission logic for Accept/Reject/Counter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function canRespond(bet: any) {
    if (bet.status !== 'proposed') return false;
    if (!currentUser) return false;
    if (bet.opponent_id === null) {
      // Anyone can accept except proposer
      return bet.proposer_id !== currentUser.id;
    }
    // Only the selected opponent can accept
    return bet.opponent_id === currentUser.id;
  }

  async function handleCounterSubmit(newTerms: { description: string; amount: number; odds: string }) {
    if (!currentUser || !counterBet) return;
    // Mark original bet as countered
    await supabase.from('side_bets').update({ status: 'countered' }).eq('id', counterBet.id);
    // Create new bet with swapped proposer/opponent
    await supabase.from('side_bets').insert({
      description: newTerms.description,
      amount: newTerms.amount,
      odds: newTerms.odds,
      proposer_id: currentUser.id,
      opponent_id: counterBet.proposer_id,
      accepter_id: null,
      status: 'proposed',
      winner_id: null
    });
    setShowCounter(false);
    setCounterBet(null);
    // Refresh bets
    const { data } = await supabase
      .from('side_bets')
      .select(`*, proposer:proposer_id(team_name), accepter:accepter_id(team_name), opponent:opponent_id(team_name)`) // get names
      .order('created_at', { ascending: false });
    setBets(data || []);
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading bets...</div>;
  }
  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">All Side Bets</h2>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>All</button>
          <button onClick={() => setFilter('proposed')} className={`px-3 py-1 rounded ${filter === 'proposed' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Proposed</button>
          <button onClick={() => setFilter('agreed')} className={`px-3 py-1 rounded ${filter === 'agreed' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Agreed</button>
        </div>
        {filteredBets.length === 0 ? (
          <div className="text-gray-500">No bets yet. Be the first to propose one!</div>
        ) : (
          filteredBets.map(bet => (
            <BetItem
              key={bet.id}
              bet={{
                ...bet,
                opponent_name: bet.opponent ? bet.opponent.team_name : bet.opponent_id === null ? 'Anyone' : undefined
              }}
              currentUser={currentUser}
              onAccept={() => canRespond(bet) ? handleAccept(bet.id) : undefined}
              onDelete={() => handleDelete(bet.id)}
              onSettle={() => {}}
              onReject={() => canRespond(bet) ? handleReject(bet.id) : undefined}
              onCounter={() => canRespond(bet) ? handleCounter(bet) : undefined}
              onEdit={updated => handleEdit(bet.id, updated)}
            />
          ))
        )}
        {/* Collapsed rejected bets */}
        {rejectedBets.length > 0 && (
          <div className="mt-6">
            <h3 className="text-gray-500 text-sm mb-2">Rejected Bets (click to expand)</h3>
            {rejectedBets.map(bet => (
              <div key={bet.id} className="mb-2">
                <div
                  className="bg-gray-100 text-gray-500 px-4 py-2 rounded cursor-pointer hover:bg-gray-200"
                  onClick={() => setExpandedRejected(ids => ids.includes(bet.id) ? ids.filter(id => id !== bet.id) : [...ids, bet.id])}
                >
                  <span className="font-semibold">{bet.description}</span> — <span className="italic">Rejected</span>
                  <span className="float-right">{expandedRejected.includes(bet.id) ? '▲' : '▼'}</span>
                </div>
                {expandedRejected.includes(bet.id) && (
                  <div className="border-l-4 border-gray-300 pl-4 mt-2">
                    <BetItem
                      bet={{
                        ...bet,
                        opponent_name: bet.opponent ? bet.opponent.team_name : bet.opponent_id === null ? 'Anyone' : undefined
                      }}
                      currentUser={currentUser}
                      onAccept={() => {}}
                      onDelete={() => handleDelete(bet.id)}
                      onSettle={() => {}}
                      onReject={() => {}}
                      onCounter={() => {}}
                      onEdit={updated => handleEdit(bet.id, updated)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {showCounter && counterBet && (
        <CounterModal
          bet={counterBet}
          onClose={() => setShowCounter(false)}
          onSubmit={handleCounterSubmit}
        />
      )}
    </>
  );
} 