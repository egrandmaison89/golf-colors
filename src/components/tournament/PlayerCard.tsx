import React, { useState, useEffect } from 'react';

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

export interface Round {
  PlayerRoundID: number;
  PlayerTournamentID: number;
  Number: number;
  Day: string;
  Par: number;
  Score: number;
  Holes: Hole[];
  TeeTime?: string;
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

const PlayerScorecard: React.FC<{ player: PlayerWithRounds; round?: Round }> = ({ player, round }) => {
  const rounds = player.Rounds || [];
  // Use the provided round, or fallback to latest round with scores
  const selectedRound = round || [...rounds].reverse().find((r) => Array.isArray(r.Holes) && r.Holes.some((h) => h.Score !== null));
  if (!selectedRound || !Array.isArray(selectedRound.Holes)) return null;
  const holes = selectedRound.Holes;
  console.log('PlayerScorecard: holes', holes);

  // If holes array is empty, show a message and return blank scorecard
  if (!holes.length) {
    return (
      <div className="mt-6 w-full overflow-x-auto">
        <div className="font-semibold mb-2">Scorecard</div>
        <div className="text-gray-500 italic mb-2">No scorecard data available for this round yet.</div>
        <table className="min-w-max text-center border rounded-lg bg-white/90">
          <thead>
            <tr>
              <th className="px-2 py-1 text-xs text-gray-500">HOLE</th>
              {[...Array(18)].map((_, i) => (
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
              {[...Array(18)].map((_, i) => (
                <td key={i} className="px-2 py-1 text-xs text-gray-500">&mdash;</td>
              ))}
              <td className="px-2 py-1 text-xs text-gray-500">&mdash;</td>
              <td className="px-2 py-1 text-xs text-gray-500">&mdash;</td>
              <td className="px-2 py-1 text-xs text-gray-500">&mdash;</td>
            </tr>
            <tr>
              <td className="px-2 py-1 text-xs font-bold">Score</td>
              {[...Array(18)].map((_, i) => (
                <td key={i} className={`px-2 py-1 rounded font-semibold`}> &mdash; </td>
              ))}
              <td className="px-2 py-1 font-bold">&mdash;</td>
              <td className="px-2 py-1 font-bold">&mdash;</td>
              <td className="px-2 py-1 font-bold">&mdash;</td>
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
  }

  // Compute Par row: show par if present, blank if null
  const parRow = holes.map((h) => h.Par != null ? h.Par : '—');
  const sumPar = (arr: (string | number)[]): number => arr.reduce((a: number, b) => (typeof b === 'number' ? a + b : a), 0);
  const outPar = sumPar(parRow.slice(0, 9));
  const inPar = sumPar(parRow.slice(9, 18));
  const totPar = outPar + inPar;

  // Compute score for each hole using Par and boolean flags, but only if Score is a number
  const computedScoreRow = holes.map((h) => {
    if (h.Score == null) return '';
    if (h.HoleInOne) return 1;
    if (h.Eagle) return (h.Par || 0) - 2;
    if (h.Birdie) return (h.Par || 0) - 1;
    if (h.IsPar) return h.Par || '';
    if (h.Bogey) return (h.Par || 0) + 1;
    if (h.DoubleBogey) return (h.Par || 0) + 2;
    if (h.WorseThanDoubleBogey) return (h.Par || 0) + 3;
    // If all booleans are false and Score is not null, just show the Score
    return h.Score;
  });

  // OUT/IN/TOT for computed scores: sum only completed holes (not blank)
  const sumNumbers = (arr: (string | number)[]): number => arr.reduce((a: number, b) => (typeof b === 'number' ? a + b : a), 0);
  const outScore = sumNumbers(computedScoreRow.slice(0, 9));
  const inScore = sumNumbers(computedScoreRow.slice(9, 18));
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
            <td className="px-2 py-1 text-xs text-gray-500">{outPar > 0 ? outPar : '—'}</td>
            <td className="px-2 py-1 text-xs text-gray-500">{inPar > 0 ? inPar : '—'}</td>
            <td className="px-2 py-1 text-xs text-gray-500">{totPar > 0 ? totPar : '—'}</td>
          </tr>
          <tr>
            <td className="px-2 py-1 text-xs font-bold">Score</td>
            {computedScoreRow.map((score, i) => (
              <td key={i} className={`px-2 py-1 rounded ${score !== '' ? scoreColors[getScoreType(holes[i])] : ''} font-semibold`}>
                {score === '' ? '—' : score}
              </td>
            ))}
            <td className="px-2 py-1 font-bold">{outScore || '—'}</td>
            <td className="px-2 py-1 font-bold">{inScore || '—'}</td>
            <td className="px-2 py-1 font-bold">{totScore || '—'}</td>
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
  const [bio, setBio] = useState<PlayerWithRounds>(player);
  const [selectedRoundIdx, setSelectedRoundIdx] = useState<number>(-1);

  useEffect(() => {
    // Merge in bio from golfers.json if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch('/golfers.json')
      .then(res => res.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((golfers: any[]) => {
        const match = golfers.find(g => g.PlayerID === player.PlayerID);
        if (match) {
          setBio({ ...player, ...match });
        } else {
          setBio(player);
        }
      });
  }, [player]);

  const rounds = bio.Rounds || [];
  // Find the current round (tee time in past or most recent completed)
  const now = new Date();
  let defaultIdx = rounds.findIndex(r => r.TeeTime && new Date(r.TeeTime) <= now);
  if (defaultIdx === -1) {
    defaultIdx = rounds.length - 1;
  }
  useEffect(() => {
    setSelectedRoundIdx(defaultIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bio.Rounds]);

  const handleRoundSelect = (idx: number) => setSelectedRoundIdx(idx);

  return (
    <div className="w-full bg-gradient-to-r from-blue-50 via-green-50 to-yellow-50 border-t-4 border-blue-200 shadow-inner flex flex-col md:flex-row items-center gap-6 p-6">
      <img
        src={`/headshots/${bio.PlayerID}.jpg`}
        alt={`${bio.FirstName} ${bio.LastName} headshot`}
        className="w-24 h-24 rounded-full object-cover border shadow"
        onError={e => {
          const triedHeadshotUrl = e.currentTarget.dataset.triedHeadshotUrl === 'true';
          const triedPlaceholder = e.currentTarget.dataset.triedPlaceholder === 'true';
          if (!triedHeadshotUrl && bio.HeadshotUrl && e.currentTarget.src !== bio.HeadshotUrl) {
            e.currentTarget.src = bio.HeadshotUrl;
            e.currentTarget.dataset.triedHeadshotUrl = 'true';
          } else if (!triedPlaceholder && e.currentTarget.src !== '/placeholder-headshot.png') {
            e.currentTarget.src = '/placeholder-headshot.png';
            e.currentTarget.dataset.triedPlaceholder = 'true';
          } else {
            e.currentTarget.onerror = null;
          }
        }}
      />
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h2 className="text-xl font-bold mb-2">{bio.FirstName} {bio.LastName}</h2>
          <button
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold ml-4"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="text-gray-700 mb-1">
          <span className="font-semibold">Birthdate:</span> {bio.BirthDate ? new Date(bio.BirthDate).toLocaleDateString() : 'N/A'}
        </div>
        <div className="text-gray-700 mb-1">
          <span className="font-semibold">Hometown:</span> {bio.BirthCity || 'N/A'}{bio.BirthState ? `, ${bio.BirthState}` : ''}{bio.Country ? `, ${bio.Country}` : ''}
        </div>
        <div className="text-gray-700 mb-1">
          <span className="font-semibold">College:</span> {bio.College || 'N/A'}
        </div>
        <div className="text-gray-700 mb-1">
          <span className="font-semibold">Swings:</span> {bio.Swings || 'N/A'}
        </div>
        <div className="text-gray-700 mb-1">
          <span className="font-semibold">World Golf Ranking:</span> {bio.WorldGolfRanking ?? 'N/A'}
        </div>
        {/* Round selector */}
        {rounds.length > 1 && (
          <div className="flex gap-2 mt-4 mb-2">
            {rounds.map((r, idx) => (
              <button
                key={r.PlayerRoundID || idx}
                className={`px-3 py-1 rounded ${selectedRoundIdx === idx ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'} font-semibold text-xs`}
                onClick={() => handleRoundSelect(idx)}
              >
                Round {r.Number || idx + 1}
              </button>
            ))}
          </div>
        )}
        {/* Scorecard below player info */}
        <PlayerScorecard player={bio} round={rounds[selectedRoundIdx]} />
      </div>
    </div>
  );
};

// Render PlayerScorecard below PlayerCard
// (This should be done in the parent, or you can add it here if you want it always below the card)
// For this implementation, let's render it always below the card:
export default PlayerCard; 