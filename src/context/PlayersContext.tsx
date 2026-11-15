import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAccount } from './AccountContext';
import { cleanPlayerName, displayName, exactPlayer, foldName, makePlayer, parsePlayers, type DirectoryPlayer } from '../lib/players';
import { type Category } from '../lib/category';
import { betterCategory, clampCategory, withPromotion, type TitleCounts } from '../lib/titles';
import type { PlayerAccount } from '../lib/account';

const STORAGE_KEY = 'contador-padel:players:v1';

interface PlayersContextValue {
  ready: boolean;
  players: DirectoryPlayer[];
  addPlayer: (input: { firstName: string; lastName?: string; phone?: string; category?: Category }) => DirectoryPlayer;
  setPlayerCategory: (id: string, category: Category) => void;
  applyPromotions: (titles: Map<string, TitleCounts>) => void;
}

const PlayersContext = createContext<PlayersContextValue | null>(null);

function synced(player: DirectoryPlayer, account: PlayerAccount, keepName: boolean): DirectoryPlayer {
  const categoryFloor = betterCategory(player.categoryFloor, account.categoryFloor);
  const category = clampCategory(account.category, categoryFloor);
  const firstName = keepName ? player.firstName : cleanPlayerName(account.name);
  const lastName = player.lastName;
  const name = keepName ? player.name : displayName(firstName, lastName);
  const phone = player.phone || account.phone.trim();
  if (
    player.name === name &&
    player.firstName === firstName &&
    player.phone === phone &&
    player.category === category &&
    player.categoryFloor === categoryFloor
  ) {
    return player;
  }
  return { ...player, name, firstName, lastName, phone, category, categoryFloor, updatedAt: account.updatedAt };
}

function withAccount(players: DirectoryPlayer[], account: PlayerAccount): DirectoryPlayer[] {
  const byId = players.find((player) => player.id === account.id);
  if (byId) {
    const next = synced(byId, account, false);
    if (next === byId) return players;
    return players.map((player) => (player.id === account.id ? next : player));
  }
  const byName = players.find((player) => foldName(player.name) === foldName(account.name));
  if (byName) {
    const next = synced(byName, account, true);
    if (next === byName) return players;
    return players.map((player) => (player.id === byName.id ? next : player));
  }
  return [
    ...players,
    {
      version: 1,
      id: account.id,
      name: cleanPlayerName(account.name),
      firstName: cleanPlayerName(account.name),
      lastName: '',
      phone: account.phone.trim(),
      category: clampCategory(account.category, account.categoryFloor),
      categoryFloor: account.categoryFloor,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    },
  ];
}

export function PlayersProvider({ children }: { children: ReactNode }) {
  const { ready: accountReady, account, saveAccount } = useAccount();
  const [ready, setReady] = useState(false);
  const [players, setPlayers] = useState<DirectoryPlayer[]>([]);
  const playersRef = useRef(players);
  playersRef.current = players;

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        setPlayers(parsePlayers(raw));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || !accountReady || !account) return;
    setPlayers((current) => {
      const next = withAccount(current, account);
      if (next === current) return current;
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [ready, accountReady, account]);

  const addPlayer = useCallback((input: { firstName: string; lastName?: string; phone?: string; category?: Category }) => {
    const next = makePlayer(input);
    const existing = exactPlayer(playersRef.current, next.name);
    if (existing) return existing;
    const list = [...playersRef.current, next];
    playersRef.current = list;
    setPlayers(list);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return next;
  }, []);

  const setPlayerCategory = useCallback((id: string, category: Category) => {
    const target = playersRef.current.find((player) => player.id === id);
    if (!target || target.category === category || category > target.categoryFloor) return;
    const list = playersRef.current.map((player) =>
      player.id === id ? { ...player, category, updatedAt: new Date().toISOString() } : player,
    );
    playersRef.current = list;
    setPlayers(list);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    if (account && account.id === id && account.category !== category) {
      saveAccount(account.name, account.phone, category, account.categoryFloor);
    }
  }, [account, saveAccount]);

  const applyPromotions = useCallback((titles: Map<string, TitleCounts>) => {
    const current = playersRef.current;
    let changed = false;
    const list = current.map((player) => {
      const next = withPromotion(player, titles.get(player.id));
      if (next === player) return player;
      changed = true;
      return { ...next, updatedAt: new Date().toISOString() };
    });
    if (!changed) return;
    playersRef.current = list;
    setPlayers(list);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    if (!account) return;
    const mine = list.find((player) => player.id === account.id);
    if (mine && (mine.category !== account.category || mine.categoryFloor !== account.categoryFloor)) {
      saveAccount(account.name, account.phone, mine.category, mine.categoryFloor);
    }
  }, [account, saveAccount]);

  const value = useMemo(
    () => ({ ready, players, addPlayer, setPlayerCategory, applyPromotions }),
    [ready, players, addPlayer, setPlayerCategory, applyPromotions],
  );

  return <PlayersContext.Provider value={value}>{children}</PlayersContext.Provider>;
}

export function usePlayers(): PlayersContextValue {
  const value = useContext(PlayersContext);
  if (!value) throw new Error('usePlayers must be used within PlayersProvider');
  return value;
}
