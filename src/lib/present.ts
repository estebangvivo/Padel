import type { Alert, AlertType, CompletedSet, MatchConfig, MatchState, PlayerIndex, TeamIndex } from './scoringEngine';
import { formatClock } from './timer';

const ALERT_COPY: Record<AlertType, string> = {
  matchPoint: 'MATCH POINT',
  setPoint: 'SET POINT',
  breakPoint: 'BREAK POINT',
  goldenPoint: 'PUNTO DE ORO',
  tiebreak: 'TIE-BREAK',
  superTiebreak: 'SÚPER TIE-BREAK',
};

const HERO_ORDER: AlertType[] = ['matchPoint', 'setPoint', 'goldenPoint', 'breakPoint'];

export interface PresentCopy {
  playerN: (n: number) => string;
  playerLetter: (letter: string) => string;
  pairN: (n: number) => string;
  setChip: (n: number) => string;
  superChip: string;
  alerts: Record<AlertType, string>;
  result: string;
  beat: string;
  by: string;
  padel: string;
  tennis: string;
}

const DEFAULT_COPY: PresentCopy = {
  playerN: (n) => `Jugador ${n}`,
  playerLetter: (letter) => `Jugador ${letter}`,
  pairN: (n) => `Pareja ${n}`,
  setChip: (n) => `SET ${n}`,
  superChip: 'SÚPER',
  alerts: ALERT_COPY,
  result: 'Resultado:',
  beat: 'venció a',
  by: 'por',
  padel: 'Pádel',
  tennis: 'Tenis',
};

export function playerLabel(
  config: MatchConfig,
  team: TeamIndex,
  player: PlayerIndex,
  copy: PresentCopy = DEFAULT_COPY,
): string {
  const typed = config.teams[team].players[player]?.trim() ?? '';
  if (typed) return typed;
  if (config.format === 'singles') return copy.playerN(team + 1);
  const letter = team === 0 ? ['A', 'B'][player] : ['C', 'D'][player];
  return copy.playerLetter(letter ?? 'A');
}

export function teamLabel(config: MatchConfig, team: TeamIndex, copy: PresentCopy = DEFAULT_COPY): string {
  if (config.format === 'singles') return playerLabel(config, team, 0, copy);
  const typed = config.teams[team].players.some((name) => name.trim().length > 0);
  if (!typed) return copy.pairN(team + 1);
  return `${playerLabel(config, team, 0, copy)} / ${playerLabel(config, team, 1, copy)}`;
}

export function formatSetScore(set: CompletedSet): string {
  if (set.tiebreak) {
    const loserPoints = set.games[0] > set.games[1] ? set.tiebreak[1] : set.tiebreak[0];
    return `${set.games[0]}-${set.games[1]}(${loserPoints})`;
  }
  return `${set.games[0]}-${set.games[1]}`;
}

export function scoreLine(state: MatchState): string {
  return state.sets.map(formatSetScore).join(', ');
}

export interface ScoreChip {
  key: string;
  label: string;
  text: string;
  live: boolean;
}

export function scoreChips(state: MatchState, copy: PresentCopy = DEFAULT_COPY): ScoreChip[] {
  const chips: ScoreChip[] = state.sets.map((set, index) => ({
    key: `set-${index}`,
    label: set.superTiebreak && !set.tiebreak ? copy.superChip : copy.setChip(index + 1),
    text: formatSetScore(set),
    live: false,
  }));

  if (state.status === 'finished') return chips;

  const setNumber = state.sets.length + 1;
  if ((state.phase === 'tiebreak' || state.phase === 'superTiebreak') && state.games[0] === 6 && state.games[1] === 6) {
    chips.push({
      key: 'live',
      label: copy.setChip(setNumber),
      text: `6-6 · ${state.points[0]}-${state.points[1]}`,
      live: true,
    });
  } else if (state.phase === 'superTiebreak') {
    chips.push({
      key: 'live',
      label: copy.superChip,
      text: `${state.points[0]}-${state.points[1]}`,
      live: true,
    });
  } else {
    chips.push({
      key: 'live',
      label: copy.setChip(setNumber),
      text: `${state.games[0]}-${state.games[1]}`,
      live: true,
    });
  }

  return chips;
}

export function heroAlert(alerts: Alert[]): Alert | null {
  for (const type of HERO_ORDER) {
    const found = alerts.find((alert) => alert.type === type);
    if (found) return found;
  }
  return null;
}

export function modeLabel(alerts: Alert[], copy: PresentCopy = DEFAULT_COPY): string | null {
  if (alerts.some((alert) => alert.type === 'superTiebreak')) return copy.alerts.superTiebreak;
  if (alerts.some((alert) => alert.type === 'tiebreak')) return copy.alerts.tiebreak;
  return null;
}

export function secondaryAlerts(alerts: Alert[], hero: Alert | null): Alert[] {
  return alerts.filter((alert) => {
    if (alert.type === 'tiebreak' || alert.type === 'superTiebreak') return false;
    if (!hero) return true;
    return !(alert.type === hero.type && alert.team === hero.team);
  });
}

export function alertHeadline(config: MatchConfig, alert: Alert, copy: PresentCopy = DEFAULT_COPY): string {
  const label = copy.alerts[alert.type];
  if (alert.team == null) return label;
  return `${label}  ·  ${teamLabel(config, alert.team, copy)}`;
}

export function alertCopy(type: AlertType, copy: PresentCopy = DEFAULT_COPY): string {
  return copy.alerts[type];
}

export function buildShareMessage(
  config: MatchConfig,
  state: MatchState,
  elapsedMs: number,
  copy: PresentCopy = DEFAULT_COPY,
): string {
  if (state.winner == null) return '';
  const loser = (state.winner === 0 ? 1 : 0) as TeamIndex;
  const headline = `🎾 ${copy.result} ${teamLabel(config, state.winner, copy)} ${copy.beat} ${teamLabel(config, loser, copy)} ${copy.by} ${scoreLine(state)}`;
  const sport = config.sport === 'padel' ? copy.padel : copy.tennis;
  return `${headline}\n${sport} · ${formatClock(elapsedMs)}`;
}
