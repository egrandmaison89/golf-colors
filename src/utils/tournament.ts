import type { Player } from '../types/tournament';

// Type guard for TournamentStatus
function hasTournamentStatus(player: unknown): player is { TournamentStatus: string } {
  return typeof player === 'object' && player !== null && 'TournamentStatus' in player && typeof (player as { TournamentStatus?: unknown }).TournamentStatus === 'string';
}

// Type guard for Holes array
function hasHoles(round: unknown): round is { Holes: Array<{ Score: number | null }> } {
  return typeof round === 'object' && round !== null && 'Holes' in round && Array.isArray((round as { Holes?: unknown }).Holes);
}

export function getPlayerStatus(player: Player): 'active' | 'cut' | 'withdrawn' {
  if (player.IsWithdrawn) return 'withdrawn';

  // 2. Use TournamentStatus if available
  if (hasTournamentStatus(player) && (player.TournamentStatus === 'Withdrawn' || player.TournamentStatus === 'WD')) {
      return 'withdrawn';
    }

  // Use MadeCut and IsWithdrawn for cut logic (LeaderboardBasicFinal)
  if ('MadeCut' in player && player.MadeCut === 0 && !player.IsWithdrawn) {
    return 'cut';
  }

  // 3. If player has a tee time in the past and has not completed any holes, but is not withdrawn, treat as active
  const now = new Date();
  const hasStartedRound = player.PlayerRoundScore?.some(round =>
    round.TeeTime && new Date(round.TeeTime) < now
  );

  // If the player has any non-null hole scores, they're active
  const hasAnyHoleScore = player.PlayerRoundScore?.some(round =>
    hasHoles(round) && round.Holes.some((h) => h.Score !== null)
  );

  if (hasStartedRound && (hasAnyHoleScore || !player.IsWithdrawn)) {
    return 'active';
  }

  // 4. If player has been cut (legacy logic)
  if (player.TotalStrokes > 0 && player.TotalScore === null) {
      return 'cut';
  }

  // 5. Default to active
  return 'active';
}

export function calculatePlayerScore(player: Player, allPlayers: Player[], isDraftedTab = false): number {
  const status = getPlayerStatus(player);

  // Use correct cut logic: sum first 2 rounds' Score and Par
  const calculateCutScore = (player: Player): number => {
    if ('MadeCut' in player && player.MadeCut === 0 && !player.IsWithdrawn) {
      // Prefer Rounds if present, fallback to PlayerRoundScore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rounds: any[] = (('Rounds' in player && Array.isArray((player as any).Rounds)) ? (player as any).Rounds : player.PlayerRoundScore || []).slice(0, 2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sumPar = rounds.reduce((sum: number, r: any) => sum + (r.Par || 0), 0);
      const totalStrokes = player.TotalStrokes || 0;
      const cutScore = totalStrokes - sumPar;
      if (isDraftedTab) {
        // Drafted/Team/Results tabs: (TotalStrokes - sumPar) * 2
        return cutScore * 2;
      } else {
        // Tournament Leaderboard: TotalStrokes - sumPar
        return cutScore;
      }
    }
    // fallback: old logic
    const rounds = player.PlayerRoundScore?.filter(round => round.Score > 0 && round.Par > 0) || [];
    if (rounds.length === 0) return 0;
    const totalPar = rounds.reduce((sum, round) => sum + round.Par, 0);
    const totalStrokes = rounds.reduce((sum, round) => sum + round.Score, 0);
    const scoreRelativeToPar = totalStrokes - totalPar;
    return isDraftedTab ? scoreRelativeToPar * 2 : scoreRelativeToPar;
  };

  const getHighestDraftedScore = (): number => {
    const draftedScores = allPlayers
      .map(p => {
        const status = getPlayerStatus(p);
        if (status === 'withdrawn') return null;
        return status === 'active' ? p.TotalScore || 0 : calculateCutScore(p);
      })
      .filter((score): score is number => score !== null);
    return Math.max(...draftedScores, 0);
  };

  switch (status) {
    case 'active':
      return player.TotalScore || 0;
    case 'cut':
      return calculateCutScore(player);
    case 'withdrawn':
      return getHighestDraftedScore() + 1;
    default:
      return 0;
  }
}

export function renderPlayerScore(
  player: Player,
  score: number,
  status: 'active' | 'cut' | 'withdrawn',
  isDraftedTab = false
): string {
  if (status === 'withdrawn') return 'WD';
  if (status === 'cut') {
    if ('MadeCut' in player && player.MadeCut === 0 && !player.IsWithdrawn) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rounds: any[] = (('Rounds' in player && Array.isArray((player as any).Rounds)) ? (player as any).Rounds : player.PlayerRoundScore || []).slice(0, 2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sumPar = rounds.reduce((sum: number, r: any) => sum + (r.Par || 0), 0);
      const totalStrokes = player.TotalStrokes || 0;
      let cutScore = totalStrokes - sumPar;
      if (isDraftedTab) {
        cutScore = cutScore * 2;
      }
      return `CUT (${cutScore > 0 ? '+' : ''}${cutScore})`;
    }
    // fallback: old logic
    const rounds = player.PlayerRoundScore?.filter(round => round.Score > 0 && round.Par > 0) || [];
    if (rounds.length === 0) return 'CUT';
    const totalPar = rounds.reduce((sum, round) => sum + round.Par, 0);
    const totalStrokes = rounds.reduce((sum, round) => sum + round.Score, 0);
    const scoreRelativeToPar = totalStrokes - totalPar;
    return `CUT (${scoreRelativeToPar > 0 ? '+' : ''}${scoreRelativeToPar})`;
  }
  return score > 0 ? `+${score}` : score.toString();
}