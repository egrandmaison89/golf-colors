import type { Player } from '../types/tournament';

export function getPlayerStatus(player: Player): 'active' | 'cut' | 'withdrawn' {
  if (player.TotalScore === null) {
    const hasStartedRound = player.PlayerRoundScore?.some(round => 
      round.TeeTime && new Date(round.TeeTime) < new Date() && round.Score === 0
    );

    if (hasStartedRound) {
      return 'withdrawn';
    }

    if (player.TotalStrokes > 0) {
      return 'cut';
    }
  }

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