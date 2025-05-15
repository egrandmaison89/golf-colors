import React from 'react';

interface Hole {
  PlayerRoundID: number;
  Number: number;
  Par: number;
  Score: number | null;
  ToPar: number | null;
  HoleInOne: boolean;
  DoubleEagle: boolean;
  Eagle: boolean;
  Birdie: boolean;
  IsPar: boolean;
  Bogey: boolean;
  DoubleBogey: boolean;
  WorseThanDoubleBogey: boolean;
}

interface Round {
  PlayerRoundID: number;
  PlayerTournamentID: number;
  Number: number;
  Day: string;
  Par: number;
  Score: number;
  Holes: Hole[];
}

interface PlayerWithRounds {
  PlayerID: number;
  FirstName: string;
  LastName: string;
  BirthDate?: string;
  BirthCity?: string;
  BirthState?: string;
  Country?: string;
  College?: string;
  Swings?: string;
  WorldGolfRanking?: number;
  HeadshotUrl?: string;
  Rounds?: Round[];
}

function getScoreType(hole: Hole) {
  if (hole.Eagle) return 'eagle';
  if (hole.Birdie) return 'birdie';
  if (hole.Bogey) return 'bogey';
  if (hole.DoubleBogey || hole.WorseThanDoubleBogey) return 'double';
  if (hole.IsPar) return 'par';
  return 'par';
}

const scoreColors: Record<string, string> = {
  eagle: 'bg-yellow-200 text-yellow-900',
  birdie: 'bg-green-200 text-green-900',
  bogey: 'bg-red-200 text-red-900',
  double: 'bg-blue-200 text-blue-900',
  par: 'bg-gray-100 text-gray-900',
};

const PlayerScorecard: React.FC<{ player: PlayerWithRounds }> = ({ player }) => {
  const rounds = player.Rounds || [];
  console.log('PlayerScorecard: player.Rounds', rounds);
  // Find the latest round with at least one non-null score
  const round = [...rounds].reverse().find((r) => Array.isArray(r.Holes) && r.Holes.some((h) => h.Score !== null));
  console.log('PlayerScorecard: selected round', round);
  if (!round || !Array.isArray(round.Holes)) return null;
  const holes = round.Holes;
  console.log('PlayerScorecard: holes', holes);
  const parRow = holes.map((h) => h.Par ?? 0);
  const scoreRow = holes.map((h) => typeof h.Score === 'number' ? h.Score : 0);
  // OUT/IN/TOT
  const outPar = parRow.slice(0, 9).reduce((a, b) => a + b, 0);
  const inPar = parRow.slice(9, 18).reduce((a, b) => a + b, 0);
  const totPar = outPar + inPar;
  const outScore = scoreRow.slice(0, 9).reduce((a, b) => a + b, 0);
  const inScore = scoreRow.slice(9, 18).reduce((a, b) => a + b, 0);
  const totScore = outScore + inScore;
  return (
    <div className="mt-6 w-full overflow-x-auto">
      <div className="font-semibold mb-2">Scorecard</div>
      <table className="min-w-max text-center border rounded-lg bg-white/90">
        <thead>
          <tr>
            <th className="px-2 py-1 text-xs text-gray-500">HOLE</th>
            {holes.map((_, i) => (
              <th key={i} className="px-2 py-1 text-xs text-gray-500">{i + 1}</th>
            ))}
            <th className="px-2 py-1 text-xs text-gray-500">OUT</th>
            <th className="px-2 py-1 text-xs text-gray-500">IN</th>
            <th className="px-2 py-1 text-xs text-gray-500">TOT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-2 py-1 text-xs text-gray-500">Par</td>
            {parRow.map((par, i) => (
              <td key={i} className="px-2 py-1 text-xs text-gray-500">{par}</td>
            ))}
            <td className="px-2 py-1 text-xs text-gray-500">{outPar}</td>
            <td className="px-2 py-1 text-xs text-gray-500">{inPar}</td>
            <td className="px-2 py-1 text-xs text-gray-500">{totPar}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-xs font-bold">Score</td>
            {holes.map((hole, i) => (
              <td key={i} className={`px-2 py-1 rounded ${scoreColors[getScoreType(hole)]} font-semibold`}>
                {hole.Score ?? ''}
              </td>
            ))}
            <td className="px-2 py-1 font-bold">{outScore}</td>
            <td className="px-2 py-1 font-bold">{inScore}</td>
            <td className="px-2 py-1 font-bold">{totScore}</td>
          </tr>
        </tbody>
      </table>
      <div className="flex gap-4 mt-2 text-xs items-center">
        <div className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-yellow-200 border"></span> EAGLE</div>
        <div className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-green-200 border"></span> BIRDIE</div>
        <div className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-red-200 border"></span> BOGEY</div>
        <div className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-blue-200 border"></span> DBL BOGEY OR MORE</div>
      </div>
    </div>
  );
};

interface PlayerCardProps {
  player: PlayerWithRounds;
  onClose: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onClose }) => {
  if (!player) return null;

  return (
    <div className="w-full bg-gradient-to-r from-blue-50 via-green-50 to-yellow-50 border-t-4 border-blue-200 shadow-inner flex flex-col md:flex-row items-center gap-6 p-6">
      <img
        src={`/headshots/${player.PlayerID}.jpg`}
        alt={`${player.FirstName} ${player.LastName} headshot`}
        className="w-24 h-24 rounded-full object-cover border shadow"
        onError={e => {
          const triedHeadshotUrl = e.currentTarget.dataset.triedHeadshotUrl === 'true';
          const triedPlaceholder = e.currentTarget.dataset.triedPlaceholder === 'true';
          if (!triedHeadshotUrl && player.HeadshotUrl && e.currentTarget.src !== player.HeadshotUrl) {
            e.currentTarget.src = player.HeadshotUrl;
            e.currentTarget.dataset.triedHeadshotUrl = 'true';
          } else if (!triedPlaceholder && e.currentTarget.src !== '/placeholder-headshot.png') {
            e.currentTarget.src = '/placeholder-headshot.png';
            e.currentTarget.dataset.triedPlaceholder = 'true';
          } else {
            // Prevent infinite loop
            e.currentTarget.onerror = null;
          }
        }}
      />
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h2 className="text-xl font-bold mb-2">{player.FirstName} {player.LastName}</h2>
          <button
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold ml-4"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
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
        {/* Scorecard below player info */}
        <PlayerScorecard player={player} />
      </div>
    </div>
  );
};

// Render PlayerScorecard below PlayerCard
// (This should be done in the parent, or you can add it here if you want it always below the card)
// For this implementation, let's render it always below the card:
export default PlayerCard; 