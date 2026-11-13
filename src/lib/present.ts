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

export function playerLabel(config: MatchConfig, team: TeamIndex, player: PlayerIndex): string {
  const typed = config.teams[team].players[player]?.trim() ?? '';
  if (typed) return typed;
  if (config.format === 'singles') return `Jugador ${team + 1}`;
  const letter = team === 0 ? ['A', 'B'][player] : ['C', 'D'][player];
  return `Jugador ${letter}`;
}

export function teamLabel(config: MatchConfig, team: TeamIndex): string {
  if (config.format === 'singles') return playerLabel(config, team, 0);
  const typed = config.teams[team].players.some((name) => name.trim().length > 0);
  if (!typed) return `Pareja ${team + 1}`;
  return `${playerLabel(config, team, 0)} / ${playerLabel(config, team, 1)}`;
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

export function scoreChips(state: MatchState): ScoreChip[] {
  const chips: ScoreChip[] = state.sets.map((set, index) => ({
    key: `set-${index}`,
    label: set.superTiebreak && !set.tiebreak ? 'SÚPER' : `SET ${index + 1}`,
    text: formatSetScore(set),
    live: false,
  }));

  if (state.status === 'finished') return chips;

  const setNumber = state.sets.length + 1;
  if ((state.phase === 'tiebreak' || state.phase === 'superTiebreak') && state.games[0] === 6 && state.games[1] === 6) {
    chips.push({
      key: 'live',
      label: `SET ${setNumber}`,
      text: `6-6 · ${state.points[0]}-${state.points[1]}`,
      live: true,
    });
  } else if (state.phase === 'superTiebreak') {
    chips.push({
      key: 'live',
      label: 'SÚPER',
      text: `${state.points[0]}-${state.points[1]}`,
      live: true,
    });
  } else {
    chips.push({
      key: 'live',
      label: `SET ${setNumber}`,
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

export function modeLabel(alerts: Alert[]): string | null {
  if (alerts.some((alert) => alert.type === 'superTiebreak')) return ALERT_COPY.superTiebreak;
  if (alerts.some((alert) => alert.type === 'tiebreak')) return ALERT_COPY.tiebreak;
  return null;
}

export function secondaryAlerts(alerts: Alert[], hero: Alert | null): Alert[] {
  return alerts.filter((alert) => {
    if (alert.type === 'tiebreak' || alert.type === 'superTiebreak') return false;
    if (!hero) return true;
    return !(alert.type === hero.type && alert.team === hero.team);
  });
}

export function alertHeadline(config: MatchConfig, alert: Alert): string {
  const label = ALERT_COPY[alert.type];
  if (alert.team == null) return label;
  return `${label}  ·  ${teamLabel(config, alert.team)}`;
}

export function alertCopy(type: AlertType): string {
  return ALERT_COPY[type];
}

export function buildShareMessage(config: MatchConfig, state: MatchState, elapsedMs: number): string {
  if (state.winner == null) return '';
  const loser = (state.winner === 0 ? 1 : 0) as TeamIndex;
  const headline = `🎾 Resultado: ${teamLabel(config, state.winner)} venció a ${teamLabel(config, loser)} por ${scoreLine(state)}`;
  const sport = config.sport === 'padel' ? 'Pádel' : 'Tenis';
  return `${headline}\n${sport} · ${formatClock(elapsedMs)}`;
}
