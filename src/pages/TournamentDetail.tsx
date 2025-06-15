import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Player, TeamPlayer, TeamScore } from '../types/tournament';
import { UserX, Trophy, ArrowLeft, Users, PenTool } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { supabase } from '../lib/supabase';
import type { Tournament } from '../types/tournament';
import { DraftedPlayers } from '../components/tournament/DraftedPlayers';
import { TeamScores } from '../components/tournament/TeamScores';
import { TournamentResults } from '../components/tournament/TournamentResults';
import { TabButton } from '../components/tournament/TabButton';
import { getPlayerStatus, calculatePlayerScore, renderPlayerScore, calculatePlayerScoreWithDraftedPlayers } from '../utils/tournament';
import { PlayerCard } from '../components/tournament/PlayerCard';
import { getCachedLeaderboard } from '../lib/tournament-cache';
import golfersData from '../../public/golfers.json';
import { loggedFetch } from '../lib/loggedFetch';
import { cachedApiFetch } from '../lib/apiCache';
import { calculateTeamScores } from '../utils/leaderboard';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const API_KEY = import.meta.env.VITE_SPORTSDATA_API_KEY;

interface PlayerOdds {
  PlayerID: number;
  Name: string;
  OddsToWin: number;
}

const MOCK_PLAYERS: Player[] = [
  { PlayerID: 1, FirstName: "Rory", LastName: "McIlroy", TotalScore: -8, IsWithdrawn: false, TotalStrokes: 280, Par: 72, PlayerRoundScore: [] },
  { PlayerID: 2, FirstName: "Jordan", LastName: "Spieth", TotalScore: -6, IsWithdrawn: false, TotalStrokes: 282, Par: 72, PlayerRoundScore: [] },
  { PlayerID: 3, FirstName: "Brooks", LastName: "Koepka", TotalScore: -5, IsWithdrawn: false, TotalStrokes: 283, Par: 72, PlayerRoundScore: [] },
  { PlayerID: 4, FirstName: "Jon", LastName: "Rahm", TotalScore: -4, IsWithdrawn: false, TotalStrokes: 284, Par: 72, PlayerRoundScore: [] },
  { PlayerID: 5, FirstName: "Justin", LastName: "Thomas", TotalScore: -3, IsWithdrawn: false, TotalStrokes: 285, Par: 72, PlayerRoundScore: [] },
  { PlayerID: 6, FirstName: "Scottie", LastName: "Scheffler", TotalScore: -2, IsWithdrawn: false, TotalStrokes: 286, Par: 72, PlayerRoundScore: [] },
  { PlayerID: 7, FirstName: "Collin", LastName: "Morikawa", TotalScore: -1, IsWithdrawn: false, TotalStrokes: 287, Par: 72, PlayerRoundScore: [] },
  { PlayerID: 8, FirstName: "Patrick", LastName: "Cantlay", TotalScore: 0, IsWithdrawn: false, TotalStrokes: 288, Par: 72, PlayerRoundScore: [] },
  { PlayerID: 9, FirstName: "Xander", LastName: "Schauffele", TotalScore: 1, IsWithdrawn: false, TotalStrokes: 289, Par: 72, PlayerRoundScore: [] },
  { PlayerID: 10, FirstName: "Viktor", LastName: "Hovland", TotalScore: 2, IsWithdrawn: false, TotalStrokes: 290, Par: 72, PlayerRoundScore: [] },
  { PlayerID: 11, FirstName: "Eric", LastName: "Grandmaison", TotalScore: -9, IsWithdrawn: false, TotalStrokes: 290, Par: 72, PlayerRoundScore: [] },
  { PlayerID: 12, FirstName: "Mike", LastName: "DiChiara", TotalScore: 2, IsWithdrawn: false, TotalStrokes: 290, Par: 72, PlayerRoundScore: [] },
  { PlayerID: 13, FirstName: "Alan", LastName: "DeLorenzo", TotalScore: -7, IsWithdrawn: false, TotalStrokes: 290, Par: 72, PlayerRoundScore: [] },
  { PlayerID: 14, FirstName: "Matt", LastName: "Houde", TotalScore: -6, IsWithdrawn: false, TotalStrokes: 290, Par: 72, PlayerRoundScore: [] },
];

type Tab = 'standings' | 'players' | 'teams' | 'results';

interface TournamentDetailProps {
  tournamentId?: string;
}

interface Profile {
  team_name: string;
  team_color?: string;
}

interface Entry {
  id: string;
  user_id: string;
  status: string;
  profiles: Profile | Profile[];
  team_players?: { player_id: number }[];
}

interface SupabaseUser {
  id: string;
}

// Utility to calculate player positions with tie logic
function getPlayerPositions(players: Player[]): Record<number, string> {
  // Sort by TotalScore (lowest first), then by PlayerID for stability
  const sorted = [...players].sort((a, b) => {
    if (a.TotalScore === b.TotalScore) return a.PlayerID - b.PlayerID;
    if (a.TotalScore === null) return 1;
    if (b.TotalScore === null) return -1;
    return a.TotalScore - b.TotalScore;
  });
  const positions: Record<number, string> = {};
  let lastScore = null;
  let lastPos = 0;
  for (let i = 0; i < sorted.length; i++) {
    const player = sorted[i];
    if (player.TotalScore === lastScore) {
      positions[player.PlayerID] = `T${lastPos}`;
    } else {
      lastPos = i + 1;
      positions[player.PlayerID] = `${lastPos}`;
    }
    lastScore = player.TotalScore;
  }
  return positions;
}

export function TournamentDetail({ tournamentId: propId }: TournamentDetailProps) {
  const { tournamentId: paramId } = useParams<{ tournamentId: string }>();
  const tournamentId = propId || paramId;

  const [players, setPlayers] = useState<Player[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [teamScores, setTeamScores] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerOdds, setPlayerOdds] = useState<PlayerOdds[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('standings');
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [entries, setEntries] = useState<Record<number, Entry[]>>({});
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teamSelectionMessage, setTeamSelectionMessage] = useState<string>('');
  const [showTeamSelectionMessage, setShowTeamSelectionMessage] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isFutureTournament, setIsFutureTournament] = useState(false);
  const [wasUnregistered, setWasUnregistered] = useState(false);
  const [registeredTeams, setRegisteredTeams] = useState<Array<{ team_name: string; team_color: string; }>>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [golfersMap, setGolfersMap] = useState<Record<number, { FirstName: string; LastName: string; WorldGolfRank: number }>>({});
  const [thruMap, setThruMap] = useState<Map<number, { holesCompleted: number, teeTime?: string }>>(new Map());

  const tournamentIdNum = tournamentId ? parseInt(tournamentId) : 0;

  const handleShowPlayerCard = (player: Player) => {
    setSelectedPlayerId(player.PlayerID === selectedPlayerId ? null : player.PlayerID);
  };
  const handleClosePlayerCard = () => setSelectedPlayerId(null);

  const renderStandings = () => {
    const isFutureTournament = tournament && new Date(tournament.StartDate) > new Date();
    const isRegistered = user?.id && entries[tournamentIdNum]?.some(
      e => e.user_id === user.id
    );
    const userEntry = user?.id && entries[tournamentIdNum]?.find(e => e.user_id === user.id);
    const userEntryId = typeof userEntry === 'object' && userEntry !== null && 'id' in userEntry ? userEntry.id : undefined;
    const userTeamPlayers = teamPlayers.filter(tp => tp.entry_id === userEntryId);

    const playerPositions = getPlayerPositions(players);

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isFutureTournament ? 'Odds to Win' : 'Total Score'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  THRU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {isFutureTournament && isRegistered && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Selection
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {players.map((player) => {
                const status = getPlayerStatus(player);
                const draftedPlayerIds = teamPlayers.map(tp => tp.player_id);
                const score = draftedPlayerIds.includes(player.PlayerID) 
                  ? calculatePlayerScoreWithDraftedPlayers(player, players, draftedPlayerIds, true)
                  : calculatePlayerScore(player, players, false);
                const isPlayerSelected = selectedPlayers.includes(player.PlayerID);
                const isPlayerTaken = teamPlayers.some(tp => 
                  tp.player_id === player.PlayerID && !selectedPlayers.includes(player.PlayerID)
                );
                
                // THRU/progress logic (robust for any round)
                let progress = '';
                const thruData = thruMap.get(player.PlayerID);
                const holesCompleted = thruData?.holesCompleted;
                const teeTime = thruData?.teeTime;
                if (typeof holesCompleted === 'number' && holesCompleted > 0 && holesCompleted < 18) {
                      progress = `${holesCompleted}`;
                } else if (holesCompleted === 18) {
                  progress = 'F';
                } else if (teeTime && new Date(teeTime) > new Date()) {
                  progress = new Date(teeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } else {
                      progress = '';
                }
                
                return [
                  <tr
                    key={player.PlayerID}
                    className={`${status === 'withdrawn' ? 'bg-red-50' : 'hover:bg-gray-50'} ${
                      isPlayerSelected ? 'bg-green-50' : ''
                    } ${isPlayerTaken ? 'bg-gray-100' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{playerPositions[player.PlayerID]}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 cursor-pointer hover:underline" onClick={() => handleShowPlayerCard(player)}>
                        {player.FirstName} {player.LastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {isFutureTournament ? (
                          playerOdds.find(p => p.PlayerID === player.PlayerID)?.OddsToWin 
                            ? `+${playerOdds.find(p => p.PlayerID === player.PlayerID)?.OddsToWin}`
                            : 'N/A'
                        ) : (
                          renderPlayerScore(player, score, status, false)
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{progress}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isFutureTournament ? (
                        isPlayerTaken ? (
                          <span className="text-gray-500">Already Selected</span>
                        ) : (
                          <span className="text-green-600">Available</span>
                        )
                      ) : status === 'withdrawn' ? (
                        <span className="flex items-center text-red-600">
                          <UserX className="h-4 w-4 mr-1" />
                          Withdrawn
                        </span>
                      ) : status === 'cut' ? (
                        <span className="flex items-center text-orange-600">
                          <UserX className="h-4 w-4 mr-1" />
                          CUT
                        </span>
                      ) : (
                        <span className="text-green-600">Active</span>
                      )}
                    </td>
                    {isFutureTournament && isRegistered && (
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handlePlayerSelection(player.PlayerID)}
                          disabled={(!isPlayerSelected && userTeamPlayers.length >= 3) || isPlayerTaken}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            isPlayerSelected
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : isPlayerTaken
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : userTeamPlayers.length >= 3
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {isPlayerSelected ? 'Remove' : isPlayerTaken ? 'Taken' : 'Select'}
                        </button>
                      </td>
                    )}
                  </tr>,
                  selectedPlayerId === player.PlayerID && (
                    <tr key={`player-card-${player.PlayerID}`}> 
                      <td colSpan={isFutureTournament && isRegistered ? 6 : 5} className="p-0">
                        <PlayerCard player={{ ...player, WorldGolfRanking: golfersMap[player.PlayerID]?.WorldGolfRank ?? player.WorldGolfRanking }} onClose={handleClosePlayerCard} />
                      </td>
                  </tr>
                  )
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Set up realtime subscription for team players
  useEffect(() => {
    const teamPlayersSubscription = supabase
      .channel('team-players-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_players'
        },
        () => {
          fetchTeamPlayers();
        }
      )
      .subscribe();

    return () => {
      teamPlayersSubscription.unsubscribe();
    };
  }, [tournamentId]);

  // Fetch team players data
  async function fetchTeamPlayers() {
    const { data: teamPlayersData } = await supabase
      .from('team_players')
      .select('*, tournament_entries!inner(tournament_id, profiles(team_name, team_color))')
      .eq('tournament_entries.tournament_id', tournamentId)
      .order('created_at');

    if (teamPlayersData) {
      const formattedTeamPlayers = teamPlayersData.map(tp => ({
        ...tp,
        profile: {
          team_name: tp.tournament_entries?.profiles?.team_name || 'Unknown Team',
          team_color: tp.tournament_entries?.profiles?.team_color || 'Blue'
        }
      }));
      
      setTeamPlayers(formattedTeamPlayers);
      setTeamScores(calculateTeamScores(players, formattedTeamPlayers));
    }
  }

  // Move fetchEntries out of useEffect so it can be called elsewhere
    async function fetchEntries() {
      const { data: entriesData } = await supabase
        .from('tournament_entries')
        .select('id, user_id, status, team_players(player_id), profiles!inner(team_name, team_color)')
        .eq('tournament_id', tournamentId)
        .eq('status', 'registered')
        .order('created_at', { ascending: true });

      if (entriesData) {
      setEntries({ [tournamentIdNum]: entriesData });
      if (user?.id) {
        const userEntry = entriesData.find((e: Entry) => e.user_id === user.id);
          setIsRegistered(!!userEntry);
        }
        // Extract registered teams
      const teams = entriesData.map((entry: Entry) => ({
        team_name: (Array.isArray(entry.profiles) ? entry.profiles[0]?.team_name : entry.profiles.team_name) || 'Unknown Team',
        team_color: (Array.isArray(entry.profiles) ? entry.profiles[0]?.team_color : entry.profiles.team_color) || 'Blue',
        }));
        setRegisteredTeams(teams);
      }
    }

  useEffect(() => {
    fetchEntries();
  }, [tournamentId, user]);

  // Fix setUser usage for Supabase session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) setUser({ id: session.user.id });
      else setUser(null);
    });
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser({ id: user.id });
      else setUser(null);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function fetchTournamentDetails() {
      try {
        // Check if user was unregistered from this tournament
        // Check if user has access through leagues
        if (user?.id) {
          const { data: entry } = await supabase
            .from('tournament_entries')
            .select('status')
            .eq('tournament_id', tournamentId)
            .eq('user_id', user.id)
            .single();

          setWasUnregistered(entry?.status === 'unregistered');
        }

        // Only fetch tournament if not already set
        if (!tournament) {
          // Try to get from local cache first (if you have one)
          // Otherwise, fetch from SportsData API
          const tournamentResp = await fetch(`https://api.sportsdata.io/golf/v2/json/Tournaments?key=${API_KEY}`);
          if (tournamentResp.ok) {
            const tournaments: Tournament[] = await tournamentResp.json();
            const found = tournaments.find(t => t.TournamentID === Number(tournamentId));
            if (found) setTournament(found);
          }
        }

        let sortedPlayers: Player[];
        const newThruMap = new Map<number, { holesCompleted: number, teeTime?: string }>();
        if (tournamentId === '999999') {
          sortedPlayers = MOCK_PLAYERS;
        } else {
          // Use tournament to determine if future
          const isFutureTournament = tournament && new Date(tournament.StartDate) > new Date();
          if (isFutureTournament) {
            const playersData = await cachedApiFetch(
              `https://api.sportsdata.io/golf/v2/json/PlayerTournamentRoundScores/${tournamentId}?key=${API_KEY}`,
              () => loggedFetch(
                `https://api.sportsdata.io/golf/v2/json/PlayerTournamentRoundScores/${tournamentId}?key=${API_KEY}`,
                undefined,
                'TournamentDetail:PlayerTournamentRoundScores'
              ).then(r => r.json()),
              30 * 60 * 1000
            );
            sortedPlayers = playersData;

            const oddsDataRaw: unknown = await cachedApiFetch(
              `https://api.sportsdata.io/v3/golf/odds/json/TournamentOddsLineMovement/${tournamentId}?key=${API_KEY}`,
              () => loggedFetch(
                `https://api.sportsdata.io/v3/golf/odds/json/TournamentOddsLineMovement/${tournamentId}?key=${API_KEY}`,
                undefined,
                'TournamentDetail:TournamentOddsLineMovement'
              ).then(r => r.json()),
              30 * 60 * 1000
            );
            const oddsData = oddsDataRaw as Array<{ PlayerID: number; OddsToWin: number }>;
            if (Array.isArray(oddsData)) {
              const playerOddsMap = new Map<number, number>();
              oddsData.forEach((odds) => {
                playerOddsMap.set(odds.PlayerID, odds.OddsToWin);
              });
              const processedOdds = Array.from(playerOddsMap.entries()).map(([PlayerID, OddsToWin]) => ({
                PlayerID,
                Name: sortedPlayers.find((p: Player) => p.PlayerID === PlayerID)?.FirstName + ' ' + 
                     sortedPlayers.find((p: Player) => p.PlayerID === PlayerID)?.LastName,
                OddsToWin
              }));
              setPlayerOdds(processedOdds);
            }
          } else {
            // For active/completed tournaments, fetch both leaderboard and detailed round data
            const status = (tournament && new Date(tournament.EndDate) < new Date()) ? 'completed' : 'active';
            console.log('Before getCachedLeaderboard');
            let leaderboardDataRaw: unknown;
            try {
              leaderboardDataRaw = await getCachedLeaderboard(tournamentId || tournamentIdNum, status);
              console.log('After getCachedLeaderboard:', leaderboardDataRaw);
            } catch (err) {
              console.error('Error in getCachedLeaderboard:', err);
              throw err;
            }
            console.log('Leaderboard API raw data:', leaderboardDataRaw);
            console.log('Leaderboard data structure:', JSON.stringify(leaderboardDataRaw, null, 2));
            const leaderboardData = leaderboardDataRaw as { Players: Player[] };
            if (!leaderboardData.Players) throw new Error('No player data in leaderboard');
            
            // For active tournaments, also fetch detailed round data to ensure scorecard data is available
            let detailedPlayersData: Player[] = [];
            if (status === 'active') {
              try {
                const detailedData = await cachedApiFetch(
                  `https://api.sportsdata.io/golf/v2/json/PlayerTournamentRoundScores/${tournamentId}?key=${API_KEY}`,
                  () => loggedFetch(
                    `https://api.sportsdata.io/golf/v2/json/PlayerTournamentRoundScores/${tournamentId}?key=${API_KEY}`,
                    undefined,
                    'TournamentDetail:PlayerTournamentRoundScores'
                  ).then(r => r.json()),
                  30 * 60 * 1000 // 30 minutes TTL
                );
                detailedPlayersData = detailedData as Player[];
                console.log('Detailed round data fetched for active tournament');
                console.log('Detailed round data structure:', JSON.stringify(detailedData, null, 2));
              } catch (err) {
                console.warn('Failed to fetch detailed round data, using leaderboard data only:', err);
                detailedPlayersData = leaderboardData.Players;
              }
            } else {
              // For completed tournaments, leaderboard data should be sufficient
              detailedPlayersData = leaderboardData.Players;
            }
            
            // Merge leaderboard data (for THRU) with detailed round data (for scorecards)
            const mergedPlayers = detailedPlayersData.map(detailedPlayer => {
              const leaderboardPlayer = leaderboardData.Players.find(p => p.PlayerID === detailedPlayer.PlayerID);
              return {
                ...detailedPlayer,
                // Preserve any leaderboard-specific data while keeping detailed round data
                ...(leaderboardPlayer ? {
                  TotalScore: leaderboardPlayer.TotalScore,
                  TotalStrokes: leaderboardPlayer.TotalStrokes,
                  MadeCut: leaderboardPlayer.MadeCut,
                  IsWithdrawn: leaderboardPlayer.IsWithdrawn
                } : {})
              };
            });
            
            sortedPlayers = mergedPlayers;
            
            // Build a map of PlayerID to THRU (holes completed) and TeeTime
            // Check both leaderboard data and detailed round data for comprehensive THRU info
            mergedPlayers.forEach((player: any) => {
              let holesCompleted = 0;
              let teeTime: string | undefined = undefined;
              
              // Method 1: Check leaderboard data for THRU (LeaderboardBasic format)
              const leaderboardPlayer = leaderboardData.Players.find((p: any) => p.PlayerID === player.PlayerID);
              if (leaderboardPlayer) {
                if (typeof leaderboardPlayer.TotalThrough === 'number') {
                  holesCompleted = leaderboardPlayer.TotalThrough;
                } else if (typeof leaderboardPlayer.Thru === 'number') {
                  holesCompleted = leaderboardPlayer.Thru;
                } else if (typeof leaderboardPlayer.THRU === 'number') {
                  holesCompleted = leaderboardPlayer.THRU;
                } else if (typeof leaderboardPlayer.HolesCompleted === 'number') {
                  holesCompleted = leaderboardPlayer.HolesCompleted;
                }
                
                // Check for TeeTime in leaderboard data
                if (leaderboardPlayer.TeeTime) {
                  teeTime = leaderboardPlayer.TeeTime;
                } else if (leaderboardPlayer.teeTime) {
                  teeTime = leaderboardPlayer.teeTime;
                }
              }
              
              // Method 2: Extract from detailed rounds data (PlayerTournamentRoundScores format)
              // This is especially important for completed rounds and scorecard data
              if (Array.isArray(player.Rounds) || Array.isArray(player.PlayerRoundScore)) {
                const rounds = player.Rounds || player.PlayerRoundScore || [];
                const now = new Date();
                let currentRound: unknown = null;
                
                // Find current round by date
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                currentRound = rounds.find((r: any) => r.Day && r.Day.slice(0, 10) === now.toISOString().slice(0, 10));
                if (!currentRound) {
                  // Find most recent round with scores
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  currentRound = [...rounds].reverse().find((r: any) => Array.isArray(r.Holes) && r.Holes.some((h: any) => h.Score !== null));
                }
                
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (currentRound && Array.isArray((currentRound as any).Holes)) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const roundHolesCompleted = (currentRound as any).Holes.filter((h: any) => h.Score !== null).length;
                  // Use detailed round data if we don't have leaderboard THRU data or if it's more complete
                  if (holesCompleted === 0 || roundHolesCompleted > holesCompleted) {
                    holesCompleted = roundHolesCompleted;
                  }
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  if (!teeTime && (currentRound as any).TeeTime) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    teeTime = (currentRound as any).TeeTime;
                  }
                } else if (rounds.length > 0) {
                  // Check for upcoming tee time
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const nextRound = rounds.find((r: any) => r.TeeTime && new Date(r.TeeTime) > now);
                  if (nextRound && !teeTime) teeTime = nextRound.TeeTime;
                }
              }
              
              // Debug output
              console.debug('THRU DEBUG', {
                playerId: player.PlayerID,
                playerName: player.Name || `${player.FirstName} ${player.LastName}`,
                leaderboardThru: leaderboardPlayer?.TotalThrough,
                calculatedHoles: holesCompleted,
                teeTime,
                hasRounds: !!(player.Rounds || player.PlayerRoundScore),
                playerObject: player,
              });
              
              newThruMap.set(player.PlayerID, { holesCompleted, teeTime });
            });
          }
        }
        // Ensure FirstName and LastName are present for each player
        sortedPlayers = sortedPlayers.map((player: Player & { Name?: string; Rounds?: Player["PlayerRoundScore"] }) => {
          let FirstName = player.FirstName;
          let LastName = player.LastName;
          if (!FirstName || !LastName) {
            if (player.Name) {
              const parts = player.Name.split(' ');
              FirstName = FirstName || parts[0];
              LastName = LastName || parts.slice(1).join(' ');
            } else if (golfersMap[player.PlayerID]) {
              FirstName = golfersMap[player.PlayerID].FirstName;
              LastName = golfersMap[player.PlayerID].LastName;
            }
          }
          // Ensure Rounds property exists (alias PlayerRoundScore if needed)
          let Rounds = player.Rounds;
          if (!Rounds && Array.isArray(player.PlayerRoundScore)) {
            Rounds = player.PlayerRoundScore;
          }
          return {
            ...player,
            FirstName,
            LastName,
            Rounds,
          };
        });
        setPlayers(sortedPlayers);
        setThruMap(newThruMap);

        const { data: teamPlayersData } = await supabase
          .from('team_players')
          .select('*, tournament_entries!inner(tournament_id, profiles(team_name, team_color))')
          .eq('tournament_entries.tournament_id', tournamentId)
          .order('created_at');

        if (teamPlayersData) {
          const formattedTeamPlayers = teamPlayersData.map(tp => ({
            ...tp,
            profile: {
              team_name: tp.tournament_entries?.profiles?.team_name || 'Unknown Team',
              team_color: tp.tournament_entries?.profiles?.team_color || 'Blue'
            }
          }));
          
          setTeamPlayers(formattedTeamPlayers);
          setTeamScores(calculateTeamScores(sortedPlayers, formattedTeamPlayers));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tournament details');
      } finally {
        setLoading(false);
      }
    }

    fetchTournamentDetails();
  }, [tournamentId, user, tournament]);

  useEffect(() => {
    if (tournament) {
      setIsFutureTournament(new Date(tournament.StartDate) > new Date());
    }
  }, [tournament]);

  // Handle selected players when entries change
  useEffect(() => {
    if (user?.id && entries[tournamentIdNum] && teamPlayers.length > 0) {
      const userTeamPlayers = teamPlayers.filter(tp => 
        entries[tournamentIdNum]?.some(e => 
          e.user_id === user.id && e.id === tp.entry_id
        )
      );
      setSelectedPlayers(userTeamPlayers.map(tp => tp.player_id));
    }
  }, [entries, user, tournamentIdNum, teamPlayers]);

  async function handlePlayerSelection(playerId: number) {
    if (!user) return;
    
    const userEntry = entries[tournamentIdNum]?.find(e => e.user_id === user.id);
    if (!userEntry) return;

    const { data: currentTeamPlayers } = await supabase
      .from('team_players')
      .select('player_id')
      .eq('entry_id', userEntry.id);

    const currentPlayerCount = currentTeamPlayers?.length || 0;
    
    setShowTeamSelectionMessage(true);
    try {
      if (selectedPlayers.includes(playerId)) {
        const { error } = await supabase
          .from('team_players')
          .delete()
          .match({
            entry_id: userEntry.id,
            player_id: playerId
          });
        
        if (error) throw error;
        setSelectedPlayers(prev => prev.filter(id => id !== playerId));
        
        const { data: updatedTeamPlayers } = await supabase
          .from('team_players')
          .select('*, tournament_entries!inner(tournament_id, profiles(team_name))')
          .eq('tournament_entries.tournament_id', tournamentId);

        if (updatedTeamPlayers) {
          const formattedTeamPlayers = updatedTeamPlayers.map(tp => ({
            ...tp,
            profile: {
              team_name: tp.tournament_entries?.profiles?.team_name || 'Unknown Team'
            }
          }));
          setTeamPlayers(formattedTeamPlayers);
          setTeamScores(calculateTeamScores(players, formattedTeamPlayers));
        }
      } else if (currentPlayerCount < 3) {
        const { error } = await supabase
          .from('team_players')
          .insert([{
            entry_id: userEntry.id,
            player_id: playerId
          }]);
        
        if (error) throw error;
        setSelectedPlayers(prev => [...prev, playerId]);
        
        const { data: updatedTeamPlayers } = await supabase
          .from('team_players')
          .select('*, tournament_entries!inner(tournament_id, profiles(team_name))')
          .eq('tournament_entries.tournament_id', tournamentId);

        if (updatedTeamPlayers) {
          const formattedTeamPlayers = updatedTeamPlayers.map(tp => ({
            ...tp,
            profile: {
              team_name: tp.tournament_entries?.profiles?.team_name || 'Unknown Team'
            }
          }));
          setTeamPlayers(formattedTeamPlayers);
          setTeamScores(calculateTeamScores(players, formattedTeamPlayers));
        }
      }
    } catch (err) {
      console.error('Error managing team players:', err);
    }
  }

  useEffect(() => {
    if (selectedPlayers.length === 0) {
      setTeamSelectionMessage('Select 3 players to complete your team');
    } else if (selectedPlayers.length < 3) {
      setTeamSelectionMessage(`Select ${3 - selectedPlayers.length} more player${selectedPlayers.length === 2 ? '' : 's'} to complete your team`);
    } else {
      setTeamSelectionMessage('Your team is complete!');
    }
  }, [selectedPlayers]);

  async function handleRegister() {
    if (!user) return;
    if (tournament) {
      const now = new Date();
      const startDate = new Date(tournament.StartDate);
      if (startDate <= now) {
        alert('Registration is closed. This tournament has already started.');
        return;
      }
    }
    try {
      const { error } = await supabase
        .from('tournament_entries')
        .insert([
          { tournament_id: tournamentIdNum, user_id: user.id }
        ]);
      if (error) throw error;
      setIsRegistered(true);
      await fetchEntries();
    } catch (err) {
      console.error('Error registering for tournament:', err);
    }
  }

  async function handleUnregister() {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('tournament_entries')
        .delete()
        .match({ tournament_id: tournamentIdNum, user_id: user.id });
      if (error) throw error;
      setIsRegistered(false);
      await fetchEntries();
    } catch (err) {
      console.error('Error unregistering from tournament:', err);
    }
  }

  useEffect(() => {
    setGolfersMap(() => {
      const map: Record<number, { FirstName: string; LastName: string; WorldGolfRank: number }> = {};
      for (const g of golfersData) {
        map[g.PlayerID] = { FirstName: g.FirstName, LastName: g.LastName, WorldGolfRank: g.WorldGolfRank ?? 0 };
      }
      return map;
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between mt-2 mb-2">
            <div className="flex items-center space-x-4 flex-1">
              <Link
                to="/tournaments"
                className="flex items-center text-green-600 hover:text-green-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </Link>
          {showTeamSelectionMessage && user?.id && isRegistered && (
                <div className={`px-4 py-2 rounded-lg ${
                  selectedPlayers.length === 3
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {teamSelectionMessage}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
          {isFutureTournament && user?.id && !isRegistered && (
                <button
                  onClick={handleRegister}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Register for Tournament
                </button>
              )}
          {isFutureTournament && user?.id && isRegistered && (
            <button
              onClick={handleUnregister}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Unregister
                </button>
              )}
              <Trophy className="h-6 w-6 text-green-600" />
          <span className="text-lg font-semibold text-gray-900">{tournament?.Name || 'Loading...'}</span>
            </div>
      </div>

          {wasUnregistered && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                You were unregistered from this tournament. Please contact support if you believe this was in error.
              </p>
            </div>
          )}

          <div className="overflow-x-auto pb-2 mb-2">
            <div className="flex flex-wrap gap-2 min-w-max">
              <TabButton
                active={activeTab === 'standings'} 
                onClick={() => setActiveTab('standings')} 
                icon={isFutureTournament ? <PenTool /> : <Trophy />}
                text={isFutureTournament ? 'Draft' : 'Leaderboard'}
                fullText={isFutureTournament ? 'Draft Central' : 'Tournament Leaderboard'}
              />
              <TabButton
                active={activeTab === 'players'}
                onClick={() => setActiveTab('players')}
                icon={<Users className="h-5 w-5 text-blue-500" />}
                text="Players"
                fullText="Drafted Players"
              />
              <TabButton
                active={activeTab === 'teams'}
                onClick={() => setActiveTab('teams')}
                icon={<Users />}
                text="Teams"
                fullText="Team Leaderboard"
              />
              <TabButton
                active={activeTab === 'results'}
                onClick={() => setActiveTab('results')}
                icon={<Trophy />}
                text="Results"
                fullText="Results"
              />
            </div>
          </div>
          {activeTab === 'standings' && renderStandings()}
          {activeTab === 'players' && (
            <DraftedPlayers
              players={players}
              teamPlayers={teamPlayers}
              getPlayerStatus={getPlayerStatus}
              calculatePlayerScore={(player, allPlayers) => {
                const draftedPlayerIds = teamPlayers.map(tp => tp.player_id);
                return calculatePlayerScoreWithDraftedPlayers(player, allPlayers, draftedPlayerIds, true);
              }}
              renderPlayerScore={(player, score, status) => renderPlayerScore(player, score, status, true)}
              selectedPlayerId={selectedPlayerId}
              setSelectedPlayerId={setSelectedPlayerId}
              golfersMap={golfersMap}
              thruMap={thruMap}
              playerPositions={getPlayerPositions(players)}
            />
          )}
          {activeTab === 'teams' && <TeamScores teamScores={teamScores} registeredTeams={registeredTeams} />}
      {activeTab === 'results' && <TournamentResults teamScores={teamScores} players={players} registeredTeams={registeredTeams} />}
    </div>
  );
}

export default TournamentDetail