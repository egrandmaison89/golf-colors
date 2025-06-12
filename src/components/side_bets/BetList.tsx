import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { BetItem } from './BetItem';
import { CounterModal } from './CounterModal';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface BetListProps {
  currentUser?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

type BetFilter = 'all' | 'proposed' | 'agreed' | 'my';
type SortOption = 'recent' | 'oldest' | 'amount';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BetList({ currentUser }: BetListProps) {
  const [bets, setBets] = useState<any[]>([]); // TODO: Replace any with proper type
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BetFilter>('all');
  const [showCounter, setShowCounter] = useState(false);
  const [counterBet, setCounterBet] = useState<any>(null);
  const [expandedRejected, setExpandedRejected] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>('recent');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    async function fetchBets() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('side_bets')
        .select(`*, proposer:proposer_id(team_name, team_color), accepter:accepter_id(team_name, team_color), opponent:opponent_id(team_name, team_color)`) // get names and colors
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
  let filteredBets =
    filter === 'all' ? bets.filter(bet => bet.status !== 'rejected') : filter === 'proposed' ? proposedBets : filter === 'agreed' ? agreedBets : bets;
  if (filter === 'my' && currentUser) {
    filteredBets = bets.filter(bet =>
      (bet.proposer_id === currentUser.id ||
      bet.accepter_id === currentUser.id ||
      bet.opponent_id === currentUser.id) &&
      bet.status !== 'rejected'
    );
  }

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
      .select(`*, proposer:proposer_id(team_name, team_color), accepter:accepter_id(team_name, team_color), opponent:opponent_id(team_name, team_color)`) // get names and colors
      .order('created_at', { ascending: false });
    setBets(data || []);
  }

  // Sorting logic
  const sortedBets = [...filteredBets];
  if (sort === 'recent') {
    sortedBets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sort === 'oldest') {
    sortedBets.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else if (sort === 'amount') {
    sortedBets.sort((a, b) => b.amount - a.amount);
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
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>All</button>
          <button onClick={() => setFilter('proposed')} className={`px-3 py-1 rounded ${filter === 'proposed' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Proposed</button>
          <button onClick={() => setFilter('agreed')} className={`px-3 py-1 rounded ${filter === 'agreed' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Agreed</button>
          {currentUser && (
            <button onClick={() => setFilter('my')} className={`px-3 py-1 rounded ${filter === 'my' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>My Bets</button>
          )}
          <div className="ml-auto">
            <label className="mr-2 text-gray-600 font-medium">Sort by:</label>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortOption)}
              className="border rounded px-2 py-1 text-gray-700"
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest</option>
              <option value="amount">Highest Amount</option>
            </select>
          </div>
        </div>
        {sortedBets.length === 0 ? (
          <div className="text-gray-500">No bets yet. Be the first to propose one!</div>
        ) : (
          sortedBets.map(bet => (
            <div key={bet.id} id={`side-bet-${bet.id}`} className="mb-6">
              <BetItem
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
              <div className="text-xs text-gray-500 mt-1 ml-1">
                {(
                  bet.status === 'accepted'
                    ? `Accepted ${new Date(bet.updated_at || bet.created_at).toLocaleString()}`
                    : bet.status === 'rejected'
                    ? `Rejected ${new Date(bet.updated_at || bet.created_at).toLocaleString()}`
                    : `Proposed ${new Date(bet.created_at).toLocaleString()}`
                )}
              </div>
            </div>
          ))
        )}

        {/* Archived / Rejected Bets */}
        {rejectedBets.length > 0 && (
          <div className="mt-8">
            <button
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 focus:outline-none"
              onClick={() => setShowArchived(v => !v)}
              aria-expanded={showArchived}
            >
              <span className="font-semibold">Archived / Rejected Bets</span>
              <span className="ml-2">{showArchived ? '▲' : '▼'}</span>
            </button>
            {showArchived && (
              <div className="mt-2 space-y-4">
                {rejectedBets.map(bet => (
                  <div key={bet.id} id={`side-bet-archived-${bet.id}`} className="mb-2">
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
                    <div className="text-xs text-gray-400 mt-1 ml-1">
                      {`Rejected ${new Date(bet.updated_at || bet.created_at).toLocaleString()}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {showCounter && (
        <CounterModal
          bet={counterBet}
          onSubmit={handleCounterSubmit}
          onClose={() => setShowCounter(false)}
        />
      )}
    </>
  );
}