import { parseCategory, type Category } from './category';
import { betterCategory, clampCategory } from './titles';
import { createId } from './tournament';

export interface PlayerAccount {
  version: 1;
  id: string;
  name: string;
  phone: string;
  category: Category;
  categoryFloor: Category;
  createdAt: string;
  updatedAt: string;
}

export interface PairNames {
  playerA: string;
  playerB: string;
  phone: string;
  playerAId?: string | null;
  playerBId?: string | null;
}

export function parseAccount(raw: string | null): PlayerAccount | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PlayerAccount>;
    if (value.version !== 1 || typeof value.id !== 'string' || !value.id || typeof value.name !== 'string' || !value.name.trim()) {
      return null;
    }
    return {
      version: 1,
      id: value.id,
      name: value.name.trim(),
      phone: typeof value.phone === 'string' ? value.phone.trim() : '',
      category: parseCategory(value.category),
      categoryFloor: parseCategory(value.categoryFloor),
      createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date(0).toISOString(),
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function createAccount(
  name: string,
  phone: string,
  category: Category | undefined,
  existing?: PlayerAccount | null,
  floor?: Category,
): PlayerAccount {
  const now = new Date().toISOString();
  const categoryFloor = betterCategory(parseCategory(floor ?? existing?.categoryFloor), parseCategory(existing?.categoryFloor));
  return {
    version: 1,
    id: existing?.id ?? createId('player'),
    name: name.trim(),
    phone: phone.trim(),
    category: clampCategory(parseCategory(category ?? existing?.category), categoryFloor),
    categoryFloor,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function placeAccountOnPair<T extends PairNames>(pair: T, account: PlayerAccount): T {
  if (pair.playerAId === account.id || pair.playerBId === account.id) return pair;
  if (!pair.playerA.trim()) {
    return {
      ...pair,
      playerA: account.name,
      playerAId: account.id,
      phone: pair.phone.trim() ? pair.phone : account.phone,
    };
  }
  if (!pair.playerB.trim()) {
    return { ...pair, playerB: account.name, playerBId: account.id };
  }
  return {
    ...pair,
    playerA: account.name,
    playerAId: account.id,
    phone: pair.phone.trim() ? pair.phone : account.phone,
  };
}
