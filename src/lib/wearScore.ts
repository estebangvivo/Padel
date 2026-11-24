import type { PresentCopy } from './present';
import { scoreChips, scoreLine, teamLabel } from './present';
import { getCurrentServer, pointLabel, setsWon, type MatchConfig, type MatchState } from './scoringEngine';

export interface WearMatch {
  config: MatchConfig;
  state: MatchState;
}

export interface WearSnapshot {
  status: 'idle' | 'live' | 'finished';
  left: string;
  right: string;
  leftPoints: string;
  rightPoints: string;
  games: string;
  sets: string;
  headline: string;
  serving: 0 | 1 | null;
}

export function interpretWearCommand(action: string): 0 | 1 | 'undo' | null {
  if (action === '0') return 0;
  if (action === '1') return 1;
  if (action === 'u') return 'undo';
  return null;
}

export function buildWearSnapshot(
  match: WearMatch | null,
  copy: PresentCopy,
  labels: { idle: string; finished: string },
): WearSnapshot {
  if (!match) {
    return {
      status: 'idle',
      left: '',
      right: '',
      leftPoints: '–',
      rightPoints: '–',
      games: '',
      sets: '',
      headline: labels.idle,
      serving: null,
    };
  }

  const { config, state } = match;
  const left = teamLabel(config, 0, copy);
  const right = teamLabel(config, 1, copy);
  const won = setsWon(state);

  if (state.status === 'finished') {
    return {
      status: 'finished',
      left,
      right,
      leftPoints: String(won[0]),
      rightPoints: String(won[1]),
      games: scoreLine(state),
      sets: `${won[0]}-${won[1]}`,
      headline: labels.finished,
      serving: null,
    };
  }

  const live = scoreChips(state, copy).find((chip) => chip.live);
  return {
    status: 'live',
    left,
    right,
    leftPoints: pointLabel(config, state, 0),
    rightPoints: pointLabel(config, state, 1),
    games: `${state.games[0]}-${state.games[1]}`,
    sets: `${won[0]}-${won[1]}`,
    headline: live?.label ?? '',
    serving: getCurrentServer(config, state).team,
  };
}
