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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: Fetch users for opponent select if editing (optional, for now just keep current opponent)

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (onEdit) {
        await onEdit({ description: desc, amount: parseFloat(amount), odds, opponentId: '' });
        setEditing(false);
      }
    } catch {
      setError('Failed to update bet');
    } finally {
      setSaving(false);
    }
  };

  // Status color logic
  const statusStyles = {
    proposed: {
      border: 'border-blue-500',
      bg: 'bg-blue-50',
      badge: 'bg-blue-500 text-white',
      label: 'Proposed',
    },
    accepted: {
      border: 'border-green-500',
      bg: 'bg-green-50',
      badge: 'bg-green-600 text-white',
      label: 'Accepted',
    },
    rejected: {
      border: 'border-red-500',
      bg: 'bg-red-50',
      badge: 'bg-red-600 text-white',
      label: 'Rejected',
    },
  };
  const style = statusStyles[bet.status as keyof typeof statusStyles] || statusStyles.proposed;

  // Helper to get team color (default blue)
  const getColor = (profile: { team_color?: string } | undefined) =>
    profile?.team_color ? profile.team_color.toLowerCase() : '#3b82f6';

  // Timestamp logic
  let timestamp = '';
  if (bet.status === 'accepted') {
    timestamp = `Accepted ${new Date(bet.updated_at || bet.created_at).toLocaleString()}`;
  } else if (bet.status === 'rejected') {
    timestamp = `Rejected ${new Date(bet.updated_at || bet.created_at).toLocaleString()}`;
  } else {
    timestamp = `Proposed ${new Date(bet.created_at).toLocaleString()}`;
  }

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
    <div
      id={`side-bet-${bet.id}`}
      className={`relative flex flex-col md:flex-row md:items-center md:justify-between rounded-lg shadow border-l-4 ${style.border} ${style.bg} px-5 py-4 mb-2`}
      style={{ minHeight: 120 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${style.badge}`}>{style.label}</span>
          <span className="font-semibold text-lg text-gray-900">{bet.description}</span>
        </div>
        <div className="text-gray-700 text-sm mb-1">Amount: ${bet.amount} | Odds: {bet.odds}</div>
        <div className="text-gray-600 text-xs flex items-center gap-2 mb-1">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full inline-block border border-white shadow" style={{ backgroundColor: getColor(bet.proposer) }} />
            <span>Proposed by: {bet.proposer?.team_name || 'Unknown'}</span>
          </span>
          {bet.accepter || bet.opponent || bet.opponent_name ? (
            <>
              <span>|</span>
              <span className="flex items-center gap-1">
                {bet.accepter
                  ? <span className="w-3 h-3 rounded-full inline-block border border-white shadow" style={{ backgroundColor: getColor(bet.accepter) }} />
                  : bet.opponent && bet.opponent.team_color
                    ? <span className="w-3 h-3 rounded-full inline-block border border-white shadow" style={{ backgroundColor: getColor(bet.opponent) }} />
                    : null}
                <span>Opponent: {bet.accepter ? bet.accepter.team_name : bet.opponent_name}</span>
              </span>
            </>
          ) : null}
        </div>
        <div className="text-xs text-gray-500 mb-2">Status: {bet.status}</div>
      </div>
      <div className="flex flex-col items-end gap-2 mt-2 md:mt-0 md:ml-4">
        {isProposed && isOpponent && (
          <div className="flex gap-2">
            <button onClick={onAccept} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Accept</button>
            <button onClick={onReject} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Reject</button>
            <button onClick={onCounter} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600">Counter</button>
          </div>
        )}
        {isProposed && isProposer && (
          <div className="flex gap-2">
            <button onClick={onDelete} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Delete</button>
            <button onClick={() => setEditing(true)} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Edit</button>
          </div>
        )}
        {/* TODO: Add settle logic/buttons as needed */}
        {/* Timestamp at bottom right */}
        <div className="text-xs text-gray-500 mt-4 border-t pt-2 w-full text-right">{timestamp}</div>
      </div>
    </div>
  );
} 