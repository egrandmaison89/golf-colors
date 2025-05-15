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

  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, team_name')
        .neq('id', currentUserId);
      if (!error && data) setUsers(data);
    }
    fetchUsers();
  }, [currentUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
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
      if (error) throw error;
      setDescription('');
      setAmount('');
      setOdds('');
      setOpponentId('');
      onBetProposed();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError((err as any).message || 'Failed to propose bet');
    } finally {
      setLoading(false);
    }
  };

  return (
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
  );
} 