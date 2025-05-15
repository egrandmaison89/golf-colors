import React, { useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface BetItemProps {
  // TODO: Replace 'any' with proper types
  bet: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  currentUser: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  onAccept: () => void;
  onDelete: () => void;
  onSettle: (winnerId: string) => void;
  onReject: () => void;
  onCounter: () => void;
  onEdit?: (updated: { description: string; amount: number; odds: string; opponentId: string }) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function BetItem({ bet, currentUser, onAccept, onDelete, onSettle, onReject, onCounter, onEdit }: BetItemProps) {
  const isOpponent = bet.accepter_id === null && currentUser?.id && bet.proposer_id !== currentUser.id;
  const isProposed = bet.status === 'proposed';
  const isProposer = currentUser?.id === bet.proposer_id;
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(bet.description);
  const [amount, setAmount] = useState(bet.amount);
  const [odds, setOdds] = useState(bet.odds);
  const [opponentId, setOpponentId] = useState(bet.opponent_id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: Fetch users for opponent select if editing (optional, for now just keep current opponent)

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (onEdit) {
        await onEdit({ description: desc, amount: parseFloat(amount), odds, opponentId });
        setEditing(false);
      }
    } catch (err) {
      setError('Failed to update bet');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="border-b py-4 flex flex-col md:flex-row md:items-center md:justify-between bg-yellow-50">
        <div className="flex-1">
          <input
            className="font-semibold text-lg w-full mb-2 border rounded px-2 py-1"
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />
          <div className="flex gap-2 mb-2">
            <input
              className="w-24 border rounded px-2 py-1"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="1"
            />
            <input
              className="w-24 border rounded px-2 py-1"
              value={odds}
              onChange={e => setOdds(e.target.value)}
              placeholder="Odds"
            />
          </div>
          {/* Opponent select could go here if you want to allow changing opponent */}
          {error && <div className="text-red-600 text-xs mb-2">{error}</div>}
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          <button onClick={handleSave} disabled={saving} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">{saving ? 'Saving...' : 'Save'}</button>
          <button onClick={() => setEditing(false)} className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div id={`side-bet-${bet.id}`} className="border-b py-4 flex flex-col md:flex-row md:items-center md:justify-between">
      <div>
        <div className="font-semibold text-lg">{bet.description}</div>
        <div className="text-gray-600 text-sm mb-1">Amount: ${bet.amount} | Odds: {bet.odds}</div>
        <div className="text-gray-500 text-xs">
          Proposed by: {bet.proposer?.team_name || 'Unknown'}
          {bet.accepter
            ? ` | Opponent: ${bet.accepter.team_name}`
            : bet.opponent_name
              ? ` | Opponent: ${bet.opponent_name}`
              : bet.opponent_id && bet.opponent_id !== bet.proposer_id
                ? ` | Opponent: [user id: ${bet.opponent_id}]`
                : ''}
        </div>
        <div className="text-xs text-gray-400">Status: {bet.status}</div>
      </div>
      <div className="mt-2 md:mt-0 flex gap-2">
        {isProposed && isOpponent && (
          <>
            <button onClick={onAccept} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Accept</button>
            <button onClick={onReject} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Reject</button>
            <button onClick={onCounter} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600">Counter</button>
          </>
        )}
        {isProposed && isProposer && (
          <>
            <button onClick={onDelete} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Delete</button>
            <button onClick={() => setEditing(true)} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Edit</button>
          </>
        )}
        {/* TODO: Add settle logic/buttons as needed */}
      </div>
    </div>
  );
} 