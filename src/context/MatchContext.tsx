import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  applyConfigToState,
  awardPoint,
  createInitialState,
  type MatchConfig,
  type MatchState,
  type TeamIndex,
} from '../lib/scoringEngine';
import { readElapsed, type TimerState } from '../lib/timer';

const STORAGE_KEY = 'contador-padel:match:v1';
const HISTORY_LIMIT = 800;

export interface SavedMatch {
  version: 1;
  config: MatchConfig;
  state: MatchState;
  history: MatchState[];
  timer: TimerState;
}

interface MatchContextValue {
  ready: boolean;
  match: SavedMatch | null;
  startMatch: (config: MatchConfig) => void;
  updateConfig: (config: MatchConfig) => 'live' | 'finished' | 'ignored';
  clearMatch: () => void;
  addPoint: (team: TeamIndex) => 'point' | 'match' | 'ignored';
  undo: () => boolean;
  resetMatch: () => void;
  toggleTimer: () => void;
  canUndo: boolean;
}

const MatchContext = createContext<MatchContextValue | null>(null);

function parseSaved(raw: string | null): SavedMatch | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as SavedMatch;
    if (value?.version !== 1) return null;
    if (value.config?.sport !== 'padel' && value.config?.sport !== 'tennis') return null;
    if (!Array.isArray(value.config.teams) || value.config.teams.length !== 2) return null;
    if (!value.state || (value.state.status !== 'live' && value.state.status !== 'finished')) return null;
    if (!Array.isArray(value.state.points) || value.state.points.length !== 2) return null;
    if (!Array.isArray(value.history) || !value.timer) return null;
    return value;
  } catch {
    return null;
  }
}

export function MatchProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [match, setMatch] = useState<SavedMatch | null>(null);
  const matchRef = useRef<SavedMatch | null>(null);

  const commit = useCallback((next: SavedMatch | null) => {
    matchRef.current = next;
    setMatch(next);
  }, []);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        commit(parseSaved(raw));
      })
      .catch(() => {
        if (!active) return;
        commit(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [commit]);

  useEffect(() => {
    if (!ready) return;
    if (!match) {
      void AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(match));
  }, [ready, match]);

  const startMatch = useCallback(
    (config: MatchConfig) => {
      commit({
        version: 1,
        config,
        state: createInitialState(),
        history: [],
        timer: { accumulatedMs: 0, running: true, runningSince: Date.now() },
      });
    },
    [commit],
  );

  const updateConfig = useCallback(
    (config: MatchConfig): 'live' | 'finished' | 'ignored' => {
      const current = matchRef.current;
      if (!current) return 'ignored';

      const state = applyConfigToState(config, current.state);
      let timer = current.timer;
      if (state.status === 'finished' && current.state.status === 'live' && timer.running && timer.runningSince != null) {
        timer = {
          accumulatedMs: readElapsed(timer, Date.now()),
          running: false,
          runningSince: null,
        };
      }

      commit({ ...current, config, state, timer });
      return state.status === 'finished' ? 'finished' : 'live';
    },
    [commit],
  );

  const clearMatch = useCallback(() => {
    commit(null);
  }, [commit]);

  const addPoint = useCallback(
    (team: TeamIndex): 'point' | 'match' | 'ignored' => {
      const current = matchRef.current;
      if (!current || current.state.status === 'finished') return 'ignored';

      const now = Date.now();
      const state = awardPoint(current.config, current.state, team);
      const finished = state.status === 'finished';
      let timer = current.timer;
      if (finished && timer.running && timer.runningSince != null) {
        timer = {
          accumulatedMs: readElapsed(timer, now),
          running: false,
          runningSince: null,
        };
      }

      commit({
        ...current,
        state,
        history: [...current.history, current.state].slice(-HISTORY_LIMIT),
        timer,
      });
      return finished ? 'match' : 'point';
    },
    [commit],
  );

  const undo = useCallback((): boolean => {
    const current = matchRef.current;
    if (!current || current.history.length === 0) return false;
    const history = current.history.slice(0, -1);
    const state = current.history[current.history.length - 1];
    if (!state) return false;

    let timer = current.timer;
    if (current.state.status === 'finished' && state.status === 'live') {
      timer = {
        accumulatedMs: timer.accumulatedMs,
        running: true,
        runningSince: Date.now(),
      };
    }

    commit({ ...current, state, history, timer });
    return true;
  }, [commit]);

  const resetMatch = useCallback(() => {
    const current = matchRef.current;
    if (!current) return;
    commit({
      ...current,
      state: createInitialState(),
      history: [],
      timer: { accumulatedMs: 0, running: true, runningSince: Date.now() },
    });
  }, [commit]);

  const toggleTimer = useCallback(() => {
    const current = matchRef.current;
    if (!current || current.state.status === 'finished') return;
    const now = Date.now();
    const timer = current.timer.running
      ? { accumulatedMs: readElapsed(current.timer, now), running: false, runningSince: null }
      : { accumulatedMs: current.timer.accumulatedMs, running: true, runningSince: now };
    commit({ ...current, timer });
  }, [commit]);

  const value = useMemo<MatchContextValue>(
    () => ({
      ready,
      match,
      startMatch,
      updateConfig,
      clearMatch,
      addPoint,
      undo,
      resetMatch,
      toggleTimer,
      canUndo: (match?.history.length ?? 0) > 0,
    }),
    [ready, match, startMatch, updateConfig, clearMatch, addPoint, undo, resetMatch, toggleTimer],
  );

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}

export function useMatch(): MatchContextValue {
  const value = useContext(MatchContext);
  if (!value) throw new Error('useMatch debe usarse dentro de MatchProvider');
  return value;
}
