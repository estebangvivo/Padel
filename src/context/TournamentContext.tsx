import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { parseSetsFormat, parseTournamentStatus, type Tournament } from '../lib/tournament';
import { parseCategory } from '../lib/category';

const STORAGE_KEY = 'contador-padel:tournaments:v1';
const URL_KEY = 'contador-padel:download-url';

interface TournamentContextValue {
  ready: boolean;
  tournaments: Tournament[];
  rememberedDownloadUrl: string;
  saveTournament: (tournament: Tournament) => void;
  removeTournament: (id: string) => void;
  rememberDownloadUrl: (url: string) => void;
}

const TournamentContext = createContext<TournamentContextValue | null>(null);

function parseList(raw: string | null): Tournament[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as Tournament[];
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item) =>
          item?.version === 1 &&
          typeof item.id === 'string' &&
          Array.isArray(item.pairs) &&
          Array.isArray(item.matches) &&
          Array.isArray(item.slots) &&
          Array.isArray(item.days),
      )
      .map((item) => ({
        ...item,
        category: parseCategory(item.category),
        setsFormat: parseSetsFormat(item.setsFormat),
        status: parseTournamentStatus(item.status),
      }));
  } catch {
    return [];
  }
}

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [rememberedDownloadUrl, setRememberedDownloadUrl] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(URL_KEY)])
      .then(([raw, url]) => {
        if (!active) return;
        setTournaments(parseList(raw));
        setRememberedDownloadUrl(url ?? '');
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveTournament = useCallback((tournament: Tournament) => {
    setTournaments((current) => {
      const exists = current.some((item) => item.id === tournament.id);
      const next = exists ? current.map((item) => (item.id === tournament.id ? tournament : item)) : [tournament, ...current];
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeTournament = useCallback((id: string) => {
    setTournaments((current) => {
      const next = current.filter((item) => item.id !== id);
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const rememberDownloadUrl = useCallback((url: string) => {
    setRememberedDownloadUrl(url);
    void AsyncStorage.setItem(URL_KEY, url);
  }, []);

  const value = useMemo(
    () => ({ ready, tournaments, rememberedDownloadUrl, saveTournament, removeTournament, rememberDownloadUrl }),
    [ready, tournaments, rememberedDownloadUrl, saveTournament, removeTournament, rememberDownloadUrl],
  );

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}

export function useTournaments(): TournamentContextValue {
  const value = useContext(TournamentContext);
  if (!value) throw new Error('useTournaments must be used inside TournamentProvider');
  return value;
}
