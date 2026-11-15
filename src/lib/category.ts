import type { MessageKey } from '../i18n/messages';

/** 8 is beginner, 1 is the top level. A smaller number is a higher category. */
export const CATEGORIES = [8, 7, 6, 5, 4, 3, 2, 1] as const;

export type Category = (typeof CATEGORIES)[number];

export const DEFAULT_CATEGORY: Category = 8;

const SHORT = {
  8: 'cat.8',
  7: 'cat.7',
  6: 'cat.6',
  5: 'cat.5',
  4: 'cat.4',
  3: 'cat.3',
  2: 'cat.2',
  1: 'cat.1',
} as const satisfies Record<Category, MessageKey>;

const LEVEL = {
  8: 'cat.level.8',
  7: 'cat.level.7',
  6: 'cat.level.6',
  5: 'cat.level.5',
  4: 'cat.level.4',
  3: 'cat.level.3',
  2: 'cat.level.2',
  1: 'cat.level.1',
} as const satisfies Record<Category, MessageKey>;

const DETAIL = {
  8: 'cat.detail.8',
  7: 'cat.detail.7',
  6: 'cat.detail.6',
  5: 'cat.detail.5',
  4: 'cat.detail.4',
  3: 'cat.detail.3',
  2: 'cat.detail.2',
  1: 'cat.detail.1',
} as const satisfies Record<Category, MessageKey>;

export function parseCategory(value: unknown): Category {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  return (CATEGORIES as readonly number[]).includes(number) ? (number as Category) : DEFAULT_CATEGORY;
}

/** A higher category (smaller number) cannot enter a lower tournament. */
export function canEnterCategory(player: Category, tournament: Category): boolean {
  return player >= tournament;
}

export function categoryShortKey(category: Category): MessageKey {
  return SHORT[parseCategory(category)];
}

export function categoryLevelKey(category: Category): MessageKey {
  return LEVEL[parseCategory(category)];
}

export function categoryDetailKey(category: Category): MessageKey {
  return DETAIL[parseCategory(category)];
}

export function categoryConflict<T extends { id: string; category: Category }>(
  ids: Array<string | null | undefined>,
  players: T[],
  tournament: Category,
): T | null {
  for (const id of ids) {
    if (!id) continue;
    const player = players.find((item) => item.id === id);
    if (player && !canEnterCategory(player.category, tournament)) return player;
  }
  return null;
}
