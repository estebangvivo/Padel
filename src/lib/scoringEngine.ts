/**
 * Pure scoring engine for tennis and padel.
 * No React, storage, or device APIs: every function takes a config and a state
 * and returns the next state.
 */

export type Sport = 'padel' | 'tennis';
export type MatchFormat = 'singles' | 'doubles';
export type DeuceRule = 'advantage' | 'golden';
export type SetsFormat = 1 | 3 | 5;
export type TeamIndex = 0 | 1;
export type PlayerIndex = 0 | 1;
export type Phase = 'regular' | 'tiebreak' | 'superTiebreak';

export interface Team {
  players: string[];
}

export interface MatchConfig {
  sport: Sport;
  format: MatchFormat;
  teams: [Team, Team];
  setsFormat: SetsFormat;
  deuceRule: DeuceRule;
  /** At 6-6, play the tie-break to 11 instead of 7. Both need a two-point margin. */
  decidingSuperTiebreak: boolean;
  initialServerTeam: TeamIndex;
  /** First and second server of each team. Singles is always [0, 0]. */
  serverOrder: [[PlayerIndex, PlayerIndex], [PlayerIndex, PlayerIndex]];
}

export interface SetupInput {
  sport: Sport;
  format: MatchFormat;
  names: [[string, string], [string, string]];
  setsFormat: SetsFormat;
  deuceRule: DeuceRule;
  /** At 6-6, play the tie-break to 11 instead of 7. Both need a two-point margin. */
  decidingSuperTiebreak: boolean;
  initialServerTeam: TeamIndex;
  initialServerPlayer: PlayerIndex;
  opponentFirstServer: PlayerIndex;
}

export interface CompletedSet {
  /** Set games. A tie-break won at 6-6 is stored as 7-6. */
  games: [number, number];
  /** Tie-break points. Null when the set was won in games. */
  tiebreak: [number, number] | null;
  /** True when the 6-6 tie-break was played to 11. */
  superTiebreak: boolean;
}

export interface MatchState {
  sets: CompletedSet[];
  games: [number, number];
  points: [number, number];
  phase: Phase;
  /** Completed games used as the base of the service rotation. A tie-break counts as one game once it ends. */
  serveGameIndex: number;
  status: 'live' | 'finished';
  winner: TeamIndex | null;
  /** True when the last point ended on a change of ends. Cleared by the next point. */
  changeOfEnds: boolean;
}

export interface Server {
  team: TeamIndex;
  playerIndex: PlayerIndex;
}

export type AlertType =
  | 'matchPoint'
  | 'setPoint'
  | 'breakPoint'
  | 'goldenPoint'
  | 'tiebreak'
  | 'superTiebreak';

export interface Alert {
  type: AlertType;
  team: TeamIndex | null;
}

const POINT_NAMES = ['0', '15', '30', '40'] as const;
const TIEBREAK_TARGET = 7;
const SUPER_TIEBREAK_TARGET = 11;

export function setsNeededToWin(setsFormat: SetsFormat): number {
  if (setsFormat === 1) return 1;
  if (setsFormat === 3) return 2;
  return 3;
}

export function createInitialState(): MatchState {
  return {
    sets: [],
    games: [0, 0],
    points: [0, 0],
    phase: 'regular',
    serveGameIndex: 0,
    status: 'live',
    winner: null,
    changeOfEnds: false,
  };
}

function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 24);
}

function partner(player: PlayerIndex): PlayerIndex {
  return player === 0 ? 1 : 0;
}

export function createMatchConfig(input: SetupInput): MatchConfig {
  const singles = input.format === 'singles';
  const teams: [Team, Team] = [
    { players: singles ? [cleanName(input.names[0][0])] : [cleanName(input.names[0][0]), cleanName(input.names[0][1])] },
    { players: singles ? [cleanName(input.names[1][0])] : [cleanName(input.names[1][0]), cleanName(input.names[1][1])] },
  ];

  const serverOrder: MatchConfig['serverOrder'] = [
    [0, 0],
    [0, 0],
  ];

  if (!singles) {
    const other = (1 - input.initialServerTeam) as TeamIndex;
    serverOrder[input.initialServerTeam] = [input.initialServerPlayer, partner(input.initialServerPlayer)];
    serverOrder[other] = [input.opponentFirstServer, partner(input.opponentFirstServer)];
  }

  return {
    sport: input.sport,
    format: input.format,
    teams,
    setsFormat: input.setsFormat,
    deuceRule: input.deuceRule,
    decidingSuperTiebreak: input.decidingSuperTiebreak,
    initialServerTeam: input.initialServerTeam,
    serverOrder,
  };
}

export function setsWon(state: MatchState): [number, number] {
  const won: [number, number] = [0, 0];
  for (const set of state.sets) {
    won[set.games[0] > set.games[1] ? 0 : 1] += 1;
  }
  return won;
}

export function serverForGame(config: MatchConfig, gameIndex: number): Server {
  const team = ((config.initialServerTeam + gameIndex) % 2) as TeamIndex;
  const turn = (Math.floor(gameIndex / 2) % 2) as PlayerIndex;
  return { team, playerIndex: config.serverOrder[team][turn] };
}

/**
 * Tie-break service (ITF / FIP): the player who would have served the next game
 * serves the first point only. After that, the serve changes every two points.
 */
export function getCurrentServer(config: MatchConfig, state: MatchState): Server {
  if (state.phase === 'regular') {
    return serverForGame(config, state.serveGameIndex);
  }
  const total = state.points[0] + state.points[1];
  const slot = total === 0 ? 0 : 1 + Math.floor((total - 1) / 2);
  return serverForGame(config, state.serveGameIndex + slot);
}

export function pointLabel(config: MatchConfig, state: MatchState, team: TeamIndex): string {
  if (state.phase !== 'regular') return String(state.points[team]);
  const [left, right] = state.points;
  if (config.deuceRule === 'advantage' && left >= 3 && right >= 3) {
    if (left === right) return '40';
    return state.points[team] > state.points[1 - team] ? 'AD' : '40';
  }
  return POINT_NAMES[Math.min(state.points[team], 3)] ?? '40';
}

export function getAlerts(config: MatchConfig, state: MatchState): Alert[] {
  if (state.status === 'finished') return [];

  const alerts: Alert[] = [];
  if (state.phase === 'tiebreak') alerts.push({ type: 'tiebreak', team: null });
  if (state.phase === 'superTiebreak') alerts.push({ type: 'superTiebreak', team: null });
  if (
    state.phase === 'regular' &&
    config.deuceRule === 'golden' &&
    state.points[0] >= 3 &&
    state.points[1] >= 3
  ) {
    alerts.push({ type: 'goldenPoint', team: null });
  }

  const server = getCurrentServer(config, state);
  for (const team of [0, 1] as const) {
    const future = awardPoint(config, state, team);
    const wonMatch = future.status === 'finished';
    const wonSet = future.sets.length > state.sets.length;
    const wonGame =
      state.phase === 'regular' &&
      (wonSet || future.phase !== 'regular' || future.games[team] > state.games[team]);

    if (wonMatch) alerts.push({ type: 'matchPoint', team });
    else if (wonSet) alerts.push({ type: 'setPoint', team });

    if (state.phase === 'regular' && server.team !== team && wonGame) {
      alerts.push({ type: 'breakPoint', team });
    }
  }

  return alerts;
}

export function awardPoint(config: MatchConfig, state: MatchState, team: TeamIndex): MatchState {
  if (state.status === 'finished') return state;

  const next = cloneState(state);
  next.changeOfEnds = false;
  if (
    next.phase === 'superTiebreak' &&
    (next.games[0] !== 6 || next.games[1] !== 6) &&
    next.points[0] === 0 &&
    next.points[1] === 0
  ) {
    next.phase = 'regular';
  }
  next.points[team] += 1;

  if (next.phase === 'regular') {
    if (!isGameWon(next.points, config.deuceRule, team)) return next;

    next.games[team] += 1;
    next.points = [0, 0];
    next.serveGameIndex += 1;

    if (isSetWonByGames(next.games, team)) {
      finishSet(next, config, [next.games[0], next.games[1]], team, null, 'games');
      return next;
    }

    if (next.games[0] === 6 && next.games[1] === 6) {
      next.phase = config.decidingSuperTiebreak ? 'superTiebreak' : 'tiebreak';
      return next;
    }

    next.changeOfEnds = (next.games[0] + next.games[1]) % 2 === 1;
    return next;
  }

  const target = next.phase === 'tiebreak' ? TIEBREAK_TARGET : SUPER_TIEBREAK_TARGET;
  if (!isTiebreakWon(next.points, target)) {
    const total = next.points[0] + next.points[1];
    next.changeOfEnds = total > 0 && total % 6 === 0;
    return next;
  }

  const tiebreak: [number, number] = [next.points[0], next.points[1]];
  const insideSet = next.games[0] === 6 && next.games[1] === 6;
  if (!insideSet) {
    finishSet(next, config, tiebreak, team, null, 'super');
    return next;
  }

  const games: [number, number] = team === 0 ? [7, 6] : [6, 7];
  next.serveGameIndex += 1;
  finishSet(next, config, games, team, tiebreak, next.phase === 'superTiebreak' ? 'super' : 'tiebreak');
  return next;
}

function isGameWon(points: [number, number], rule: DeuceRule, team: TeamIndex): boolean {
  const mine = points[team];
  const theirs = points[1 - team];
  if (rule === 'golden') return mine >= 4;
  return mine >= 4 && mine - theirs >= 2;
}

function isSetWonByGames(games: [number, number], team: TeamIndex): boolean {
  return games[team] >= 6 && games[team] - games[1 - team] >= 2;
}

function isTiebreakWon(points: [number, number], target: number): boolean {
  const best = Math.max(points[0], points[1]);
  return best >= target && Math.abs(points[0] - points[1]) >= 2;
}

function finishSet(
  state: MatchState,
  config: MatchConfig,
  setGames: [number, number],
  winner: TeamIndex,
  tiebreak: [number, number] | null,
  kind: 'games' | 'tiebreak' | 'super',
): void {
  state.sets = [
    ...state.sets,
    {
      games: [setGames[0], setGames[1]],
      tiebreak: kind === 'games' ? null : tiebreak,
      superTiebreak: kind === 'super',
    },
  ];
  state.games = [0, 0];
  state.points = [0, 0];
  state.phase = 'regular';

  const won = setsWon(state);
  if (won[winner] >= setsNeededToWin(config.setsFormat)) {
    state.status = 'finished';
    state.winner = winner;
    state.changeOfEnds = false;
    return;
  }

  state.changeOfEnds = (setGames[0] + setGames[1]) % 2 === 1;
}

export function configToSetupInput(config: MatchConfig): SetupInput {
  const other = (1 - config.initialServerTeam) as TeamIndex;
  return {
    sport: config.sport,
    format: config.format,
    names: [
      [config.teams[0].players[0] ?? '', config.teams[0].players[1] ?? ''],
      [config.teams[1].players[0] ?? '', config.teams[1].players[1] ?? ''],
    ],
    setsFormat: config.setsFormat,
    deuceRule: config.deuceRule,
    decidingSuperTiebreak: config.decidingSuperTiebreak,
    initialServerTeam: config.initialServerTeam,
    initialServerPlayer: config.format === 'singles' ? 0 : config.serverOrder[config.initialServerTeam][0],
    opponentFirstServer: config.format === 'singles' ? 0 : config.serverOrder[other][0],
  };
}

/**
 * Applies a new setup to a match that is already being played.
 * Completed points stay. The match ends only if the new set format is already won.
 * A 6-6 tie-break that has not started yet uses the selected tie-break length.
 */
export function applyConfigToState(config: MatchConfig, state: MatchState): MatchState {
  if (state.status === 'finished') return state;

  const next = cloneState(state);
  const won = setsWon(next);
  const needed = setsNeededToWin(config.setsFormat);
  if (won[0] >= needed || won[1] >= needed) {
    next.status = 'finished';
    next.winner = won[0] >= needed ? 0 : 1;
    next.changeOfEnds = false;
    return next;
  }

  const breakerNotStarted = next.points[0] === 0 && next.points[1] === 0;
  if (next.games[0] === 6 && next.games[1] === 6 && breakerNotStarted) {
    next.phase = config.decidingSuperTiebreak ? 'superTiebreak' : 'tiebreak';
  } else if (
    next.phase === 'superTiebreak' &&
    next.games[0] === 0 &&
    next.games[1] === 0 &&
    breakerNotStarted
  ) {
    next.phase = 'regular';
  }

  return next;
}

function cloneState(state: MatchState): MatchState {
  return {
    sets: state.sets.map((set) => ({
      games: [set.games[0], set.games[1]],
      tiebreak: set.tiebreak ? [set.tiebreak[0], set.tiebreak[1]] : null,
      superTiebreak: set.superTiebreak,
    })),
    games: [state.games[0], state.games[1]],
    points: [state.points[0], state.points[1]],
    phase: state.phase,
    serveGameIndex: state.serveGameIndex,
    status: state.status,
    winner: state.winner,
    changeOfEnds: state.changeOfEnds,
  };
}
