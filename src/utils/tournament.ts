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
  // 1. Use explicit withdrawn flag if available
  if (player.IsWithdrawn) return 'withdrawn';

  // 2. Use TournamentStatus if available
  if (hasTournamentStatus(player) && (player.TournamentStatus === 'Withdrawn' || player.TournamentStatus === 'WD')) {
    return 'withdrawn';
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

  // 4. If player has been cut (your existing logic)
  if (player.TotalStrokes > 0 && player.TotalScore === null) {
    return 'cut';
  }

  // 5. Default to active
  return 'active';
}

export function calculatePlayerScore(player: Player, allPlayers: Player[]): number {
  const status = getPlayerStatus(player);

  const calculateCutScore = (player: Player): number => {
    const completedRounds = player.PlayerRoundScore?.filter(round => 
      round.Score > 0 && round.Par > 0
    ) || [];
    
    if (completedRounds.length === 0 || !player.TotalStrokes) return 0;
    
    const totalPar = completedRounds.reduce((sum, round) => sum + round.Par, 0);
    const scoreRelativeToPar = player.TotalStrokes - totalPar;
    
    return scoreRelativeToPar * 2;
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
  status: 'active' | 'cut' | 'withdrawn'
): string {
  if (status === 'withdrawn') return 'WD';
  if (status === 'cut') {
    const completedRounds = player.PlayerRoundScore?.filter(round => 
      round.Score > 0 && round.Par > 0
    ) || [];
    
    if (completedRounds.length === 0 || !player.TotalStrokes) return 'CUT';
    
    const totalPar = completedRounds.reduce((sum, round) => sum + round.Par, 0);
    const score = player.TotalStrokes - totalPar;
    return `CUT (${score > 0 ? '+' : ''}${score})`;
  }
  return score > 0 ? `+${score}` : score.toString();
}