import { DEFAULT_CATEGORY, parseCategory, type Category } from './category';
import { createId } from './tournament';

export interface DirectoryPlayer {
  version: 1;
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  category: Category;
  /** Worst category this player may still be given. A smaller number is a higher level. */
  categoryFloor: Category;
  createdAt: string;
  updatedAt: string;
}

export function foldName(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function cleanPlayerName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function displayName(firstName: string, lastName: string): string {
  return [cleanPlayerName(firstName), cleanPlayerName(lastName)].filter(Boolean).join(' ');
}

export function parsePlayers(raw: string | null): DirectoryPlayer[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as DirectoryPlayer[];
    if (!Array.isArray(value)) return [];
    return value
      .filter((player) => player?.version === 1 && typeof player.id === 'string' && player.id && typeof player.name === 'string' && player.name.trim())
      .map((player) => {
        const firstName = cleanPlayerName(typeof player.firstName === 'string' && player.firstName.trim() ? player.firstName : player.name);
        const lastName = cleanPlayerName(typeof player.lastName === 'string' ? player.lastName : '');
        const phone = typeof player.phone === 'string' ? player.phone.trim() : '';
        return {
          ...player,
          firstName,
          lastName,
          phone,
          name: displayName(firstName, lastName) || cleanPlayerName(player.name),
          category: parseCategory(player.category),
          categoryFloor: parseCategory(player.categoryFloor),
        };
      });
  } catch {
    return [];
  }
}

export function searchPlayers(players: DirectoryPlayer[], query: string): DirectoryPlayer[] {
  const folded = foldName(query);
  if (!folded) return [];
  return players
    .filter((player) => foldName(`${player.firstName ?? ''} ${player.lastName ?? ''} ${player.name} ${player.phone ?? ''}`).includes(folded))
    .slice(0, 6);
}

export function exactPlayer(players: DirectoryPlayer[], query: string): DirectoryPlayer | undefined {
  const folded = foldName(query);
  if (!folded) return undefined;
  return players.find((player) => foldName(player.name) === folded);
}

export function makePlayer(input: { firstName: string; lastName?: string; phone?: string; category?: Category }): DirectoryPlayer {
  const now = new Date().toISOString();
  const firstName = cleanPlayerName(input.firstName);
  const lastName = cleanPlayerName(input.lastName ?? '');
  return {
    version: 1,
    id: createId('player'),
    firstName,
    lastName,
    phone: (input.phone ?? '').trim(),
    name: displayName(firstName, lastName),
    category: parseCategory(input.category ?? DEFAULT_CATEGORY),
    categoryFloor: DEFAULT_CATEGORY,
    createdAt: now,
    updatedAt: now,
  };
}
