import React from 'react';
import type { Player } from '../../types/tournament';

interface PlayerCardProps {
  player: Player | null;
  onClose: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onClose }) => {
  if (!player) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <div className="flex flex-col items-center">
          <img
            src={`/headshots/${player.PlayerID}.jpg`}
            alt={`${player.FirstName} ${player.LastName} headshot`}
            className="w-24 h-24 rounded-full object-cover mb-4 border"
            onError={e => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = player.HeadshotUrl || '/placeholder-headshot.png';
            }}
          />
          <h2 className="text-xl font-bold mb-2">{player.FirstName} {player.LastName}</h2>
          <div className="text-gray-700 mb-1">
            <span className="font-semibold">Birthdate:</span> {player.BirthDate ? new Date(player.BirthDate).toLocaleDateString() : 'N/A'}
          </div>
          <div className="text-gray-700 mb-1">
            <span className="font-semibold">Hometown:</span> {player.BirthCity || 'N/A'}{player.BirthState ? `, ${player.BirthState}` : ''}{player.Country ? `, ${player.Country}` : ''}
          </div>
          <div className="text-gray-700 mb-1">
            <span className="font-semibold">College:</span> {player.College || 'N/A'}
          </div>
          <div className="text-gray-700 mb-1">
            <span className="font-semibold">Swings:</span> {player.Swings || 'N/A'}
          </div>
          <div className="text-gray-700 mb-1">
            <span className="font-semibold">World Golf Ranking:</span> {player.WorldGolfRanking ?? 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}; 