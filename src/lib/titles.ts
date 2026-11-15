import { CATEGORIES, type Category } from './category';
import { parseSetScores, type FixtureMatch, type Tournament } from './tournament';

export const TITLES_TO_PROMOTE = 3;

export type TitleCounts = Partial<Record<Category, number>>;

/** The smaller number is the better category. */
export function betterCategory(a: Category, b: Category): Category {
  return a < b ? a : b;
}

/** A player cannot be worse than the category they were promoted into. */
export function clampCategory(category: Category, floor: Category): Category {
  return category > floor ? floor : category;
}

export function promotedFloor(floor: Category, titles: TitleCounts | undefined): Category {
  let next = floor;
  for (const category of CATEGORIES) {
    if (category === 1) continue;
    if ((titles?.[category] ?? 0) < TITLES_TO_PROMOTE) continue;
    next = betterCategory(next, (category - 1) as Category);
  }
  return next;
}

export function withPromotion<T extends { category: Category; categoryFloor: Category }>(
  player: T,
  titles: TitleCounts | undefined,
): T {
  const categoryFloor = promotedFloor(player.categoryFloor, titles);
  const category = clampCategory(player.category, categoryFloor);
  if (category === player.category && categoryFloor === player.categoryFloor) return player;
  return { ...player, category, categoryFloor };
}

export function titlesInCategory(titles: TitleCounts | undefined, category: Category): number {
  return titles?.[category] ?? 0;
}

export function tournamentChampions(tournament: Tournament): string[] {
  if (tournament.matches.length === 0) return [];
  if (tournament.format === 'knockout') return knockoutChampions(tournament.matches);
  return roundRobinChampions(tournament.matches);
}

function knockoutChampions(matches: FixtureMatch[]): string[] {
  const finalRound = Math.max(...matches.map((match) => match.round));
  const winners = matches
    .filter((match) => match.round === finalRound && match.winnerId && match.status !== 'scheduled')
    .map((match) => match.winnerId as string);
  return [...new Set(winners)];
}

function roundRobinChampions(matches: FixtureMatch[]): string[] {
  const decisive = matches.filter((match) => match.status !== 'bye' && match.pairAId && match.pairBId);
  if (decisive.length === 0) return [];
  if (decisive.some((match) => match.status === 'scheduled' || !match.winnerId)) return [];

  const rows = new Map<string, { wins: number; setDiff: number; gameDiff: number; against: Map<string, number> }>();
  const row = (id: string) => {
    const current = rows.get(id);
    if (current) return current;
    const created = { wins: 0, setDiff: 0, gameDiff: 0, against: new Map<string, number>() };
    rows.set(id, created);
    return created;
  };

  for (const match of decisive) {
    const left = match.pairAId as string;
    const right = match.pairBId as string;
    row(left);
    row(right);
    if (match.winnerId !== left && match.winnerId !== right) continue;
    const winner = match.winnerId as string;
    const loser = winner === left ? right : left;
    const winnerRow = row(winner);
    winnerRow.wins += 1;
    winnerRow.against.set(loser, (winnerRow.against.get(loser) ?? 0) + 1);
    const diff = margin(match.score, winner === left);
    winnerRow.setDiff += diff.sets;
    winnerRow.gameDiff += diff.games;
    const loserRow = row(loser);
    loserRow.setDiff -= diff.sets;
    loserRow.gameDiff -= diff.games;
  }

  let contenders = [...rows.entries()];
  const bestWins = Math.max(...contenders.map(([, item]) => item.wins));
  contenders = contenders.filter(([, item]) => item.wins === bestWins);
  if (contenders.length <= 1) return contenders.map(([id]) => id);

  const headToHead = (id: string) => {
    const against = rows.get(id)?.against ?? new Map<string, number>();
    return contenders.reduce((total, [other]) => total + (other === id ? 0 : (against.get(other) ?? 0)), 0);
  };
  const bestHead = Math.max(...contenders.map(([id]) => headToHead(id)));
  const separated = contenders.filter(([id]) => headToHead(id) === bestHead);
  if (separated.length === 1) return [separated[0][0]];
  contenders = separated;

  const bestSets = Math.max(...contenders.map(([, item]) => item.setDiff));
  contenders = contenders.filter(([, item]) => item.setDiff === bestSets);
  if (contenders.length === 1) return [contenders[0][0]];

  const bestGames = Math.max(...contenders.map(([, item]) => item.gameDiff));
  return contenders.filter(([, item]) => item.gameDiff === bestGames).map(([id]) => id);
}

function margin(score: string, winnerIsA: boolean): { sets: number; games: number } {
  const sets = parseSetScores(score) ?? [];
  let setDiff = 0;
  let gameDiff = 0;
  for (const set of sets) {
    const left = Number.parseInt(set.a, 10) || 0;
    const right = Number.parseInt(set.b, 10) || 0;
    const mine = winnerIsA ? left : right;
    const theirs = winnerIsA ? right : left;
    gameDiff += mine - theirs;
    if (mine !== theirs) setDiff += mine > theirs ? 1 : -1;
  }
  return { sets: setDiff, games: gameDiff };
}

export function titlesByPlayer(tournaments: Tournament[]): Map<string, TitleCounts> {
  const table = new Map<string, TitleCounts>();
  for (const tournament of tournaments) {
    const winners = new Set<string>();
    for (const pairId of tournamentChampions(tournament)) {
      const pair = tournament.pairs.find((item) => item.id === pairId);
      for (const playerId of [pair?.playerAId, pair?.playerBId]) {
        if (playerId) winners.add(playerId);
      }
    }
    for (const playerId of winners) {
      const counts = table.get(playerId) ?? {};
      counts[tournament.category] = (counts[tournament.category] ?? 0) + 1;
      table.set(playerId, counts);
    }
  }
  return table;
}
