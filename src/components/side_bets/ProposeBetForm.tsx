import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface ProposeBetFormProps {
  onBetProposed: () => void;
  currentUserId: string;
}

export function ProposeBetForm({ onBetProposed, currentUserId }: ProposeBetFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [odds, setOdds] = useState('');
  const [opponentId, setOpponentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; team_name: string }[]>([]);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      try {
        console.log('Fetching users for opponent dropdown');
        const { data, error } = await supabase
          .from('profiles')
          .select('id, team_name')
          .neq('id', currentUserId);
        
        if (error) {
          console.error('Error fetching users:', error);
          return;
        }
        
        console.log('Fetched users:', data?.length || 0);
        if (data && data.length > 0) {
          setUsers(data);
        } else {
          console.warn('No users found or empty data returned');
        }
      } catch (err) {
        console.error('Exception fetching users:', err);
      }
    }
    fetchUsers();
  }, [currentUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      console.log('Submitting bet with values:', {
        description,
        amount,
        odds,
        proposer_id: currentUserId,
        opponent_id: opponentId === 'anyone' ? null : opponentId
      });
      const opponentValue = opponentId === 'anyone' ? null : opponentId;
      const { error } = await supabase.from('side_bets').insert({
        description,
        amount: parseFloat(amount),
        odds,
        proposer_id: currentUserId,
        opponent_id: opponentValue,
        accepter_id: null,
        status: 'proposed',
        winner_id: null
      });
      if (error) {
        console.error('Supabase error when inserting bet:', error);
        throw error;
      }
      setDescription('');
      setAmount('');
      setOdds('');
      setOpponentId('');
      onBetProposed();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Error submitting bet:', err);
      if (err instanceof Error) {
        setError(err.message || 'Failed to propose bet. Check console for details.');
      } else {
        setError('Failed to propose bet. Check console for details.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all">
          Side bet proposed!
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Propose a New Bet</h2>
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1">Description</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1">Amount ($)</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
            min="1"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1">Odds</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={odds}
            onChange={e => setOdds(e.target.value)}
            required
            placeholder="e.g. +100"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1">Opponent</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={opponentId}
            onChange={e => setOpponentId(e.target.value)}
            required
          >
            <option value="">Select a user...</option>
            <option value="anyone">Anyone</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.team_name}</option>
            ))}
          </select>
        </div>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <button
          type="submit"
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors"
          disabled={loading}
        >
          {loading ? 'Proposing...' : 'Propose Bet'}
        </button>
      </form>
    </>
  );
} 