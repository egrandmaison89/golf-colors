import React, { useState } from 'react';

interface CounterModalProps {
  bet: unknown; // TODO: type
  onClose: () => void;
  onSubmit: (newTerms: { description: string; amount: number; odds: string }) => void;
}

export function CounterModal({ bet, onClose, onSubmit }: CounterModalProps) {
  // Type assertion for now
  const betObj = bet as { description: string; amount: number; odds: string };
  const [description, setDescription] = useState(betObj.description);
  const [amount, setAmount] = useState(betObj.amount.toString());
  const [odds, setOdds] = useState(betObj.odds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ description, amount: parseFloat(amount), odds });
    } catch {
      setError('Failed to submit counter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Counter Side Bet</h2>
        <form onSubmit={handleSubmit}>
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
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500">Cancel</button>
            <button type="submit" className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Counter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 