export type TournamentFormat = 'roundRobin' | 'knockout';
export type MatchStatus = 'scheduled' | 'finished' | 'walkover' | 'bye';

export interface TimeSlot {
  id: string;
  date: string;
  start: string;
  end: string;
}

export interface TournamentDay {
  date: string;
  start: string;
  end: string;
}

export interface Pair {
  id: string;
  playerA: string;
  playerB: string;
  phone: string;
  preferredSlotIds: string[];
}

export interface FixtureMatch {
  id: string;
  round: number;
  position: number;
  pairAId: string | null;
  pairBId: string | null;
  winnerId: string | null;
  court: number | null;
  slotId: string | null;
  status: MatchStatus;
  score: string;
  nextMatchId: string | null;
  nextSlot: 'A' | 'B' | null;
}

export interface Tournament {
  version: 1;
  id: string;
  name: string;
  courts: number;
  matchMinutes: number;
  format: TournamentFormat;
  walkoverScore: string;
  downloadUrl: string;
  days: TournamentDay[];
  slots: TimeSlot[];
  pairs: Pair[];
  matches: FixtureMatch[];
}

export const DEFAULT_WALKOVER = '6-3, 6-3';

export function pairName(pair: Pair | undefined): string {
  if (!pair) return '';
  return [pair.playerA.trim(), pair.playerB.trim()].filter(Boolean).join(' / ');
}

export function weekday(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1).getDay();
}

/** Friday and Saturday are the days that are hardest to fill. */
export function isHardDay(date: string): boolean {
  const day = weekday(date);
  return day === 5 || day === 6;
}

function toMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

function fromMinutes(value: number): string {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function buildSlots(days: TournamentDay[], matchMinutes: number): TimeSlot[] {
  const minutes = Math.max(30, matchMinutes);
  const slots: TimeSlot[] = [];
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  for (const day of ordered) {
    let cursor = toMinutes(day.start);
    const end = toMinutes(day.end);
    while (cursor + minutes <= end) {
      const start = fromMinutes(cursor);
      slots.push({
        id: `${day.date}_${start}`,
        date: day.date,
        start,
        end: fromMinutes(cursor + minutes),
      });
      cursor += minutes;
    }
  }
  return slots;
}

function roundRobin(ids: string[]): FixtureMatch[] {
  const row = [...ids];
  if (row.length < 2) return [];
  if (row.length % 2 === 1) row.push('');
  const count = row.length;
  let rotation = [...row];
  const matches: FixtureMatch[] = [];
  for (let round = 0; round < count - 1; round += 1) {
    for (let index = 0; index < count / 2; index += 1) {
      const left = rotation[index];
      const right = rotation[count - 1 - index];
      if (!left || !right) continue;
      const match = blankMatch(`rr${matches.length}`, round + 1, matches.length);
      match.pairAId = left;
      match.pairBId = right;
      matches.push(match);
    }
    const fixed = rotation[0];
    const rest = rotation.slice(1);
    const moved = rest.pop();
    if (moved !== undefined) rest.unshift(moved);
    rotation = [fixed, ...rest];
  }
  return matches;
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function eachDate(start: string, end: string): string[] {
  const [startYear, startMonth, startDay] = start.split('-').map(Number);
  const [endYear, endMonth, endDay] = end.split('-').map(Number);
  const cursor = new Date(startYear || 2026, (startMonth || 1) - 1, startDay || 1);
  const last = new Date(endYear || 2026, (endMonth || 1) - 1, endDay || 1);
  if (last < cursor) return [];
  const dates: string[] = [];
  while (cursor <= last && dates.length < 366) {
    dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function nextWeekdayDate(target: number, from = new Date()): string {
  const delta = (target - from.getDay() + 7) % 7 || 7;
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + delta);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function assignmentWarning(
  matches: FixtureMatch[],
  matchId: string,
  slotId: string | null,
  courts: number,
): 'court' | 'pair' | null {
  if (!slotId) return null;
  const match = matches.find((item) => item.id === matchId);
  if (!match) return null;
  const others = matches.filter((item) => item.id !== matchId && item.slotId === slotId && item.status !== 'bye');
  if (others.length >= Math.max(1, courts)) return 'court';
  const ids = [match.pairAId, match.pairBId].filter((id): id is string => Boolean(id));
  if (others.some((item) => ids.includes(item.pairAId || '') || ids.includes(item.pairBId || ''))) return 'pair';
  return null;
}

function blankMatch(id: string, round: number, position: number): FixtureMatch {
  return {
    id,
    round,
    position,
    pairAId: null,
    pairBId: null,
    winnerId: null,
    court: null,
    slotId: null,
    status: 'scheduled',
    score: '',
    nextMatchId: null,
    nextSlot: null,
  };
}

export function applyResult(
  matches: FixtureMatch[],
  matchId: string,
  winnerId: string | null,
  score: string,
  status: MatchStatus,
): FixtureMatch[] {
  const next = matches.map((match) => ({ ...match }));
  const match = next.find((item) => item.id === matchId);
  if (!match) return next;
  const previousWinner = match.winnerId;
  match.winnerId = winnerId;
  match.score = score;
  match.status = status;
  if (match.nextMatchId && match.nextSlot) {
    const destination = next.find((item) => item.id === match.nextMatchId);
    if (destination) {
      const slot = match.nextSlot === 'A' ? 'pairAId' : 'pairBId';
      if (destination[slot] == null || destination[slot] === previousWinner) destination[slot] = winnerId;
    }
  }
  return next;
}

function knockout(ids: string[]): FixtureMatch[] {
  let size = 1;
  while (size < Math.max(ids.length, 2)) size *= 2;
  const seeds = [...ids];
  while (seeds.length < size) seeds.push('');
  const rounds: FixtureMatch[][] = [];
  let count = size / 2;
  let round = 1;
  while (count >= 1) {
    rounds.push(Array.from({ length: count }, (_, position) => blankMatch(`r${round}m${position}`, round, position)));
    count /= 2;
    round += 1;
  }
  for (let index = 0; index < rounds.length - 1; index += 1) {
    rounds[index].forEach((match, position) => {
      match.nextMatchId = rounds[index + 1][Math.floor(position / 2)]?.id ?? null;
      match.nextSlot = position % 2 === 0 ? 'A' : 'B';
    });
  }
  rounds[0]?.forEach((match, position) => {
    match.pairAId = seeds[position * 2] || null;
    match.pairBId = seeds[position * 2 + 1] || null;
  });
  let matches = rounds.flat();
  for (const match of [...matches]) {
    if (match.status !== 'scheduled') continue;
    const winner = match.pairAId && !match.pairBId ? match.pairAId : !match.pairAId && match.pairBId ? match.pairBId : null;
    if (winner) matches = applyResult(matches, match.id, winner, '', 'bye');
  }
  return matches;
}

function slotScore(slot: TimeSlot, left: Pair | undefined, right: Pair | undefined): number {
  const leftPref = left ? left.preferredSlotIds.includes(slot.id) : false;
  const rightPref = right ? right.preferredSlotIds.includes(slot.id) : false;
  let score = 10;
  if (leftPref && rightPref) score = 100;
  else if (leftPref || rightPref) score = 45;
  if (isHardDay(slot.date)) {
    if (leftPref && rightPref) score -= 15;
    else if (leftPref || rightPref) score -= 40;
    else score -= 70;
  }
  return score;
}

function pairById(pairs: Pair[], id: string | null): Pair | undefined {
  if (!id) return undefined;
  return pairs.find((pair) => pair.id === id);
}

export function createFixture(pairs: Pair[], slots: TimeSlot[], courts: number, format: TournamentFormat): FixtureMatch[] {
  const courtCount = Math.max(1, courts);
  const ids = pairs.map((pair) => pair.id);
  const matches = format === 'knockout' ? knockout(ids) : roundRobin(ids);

  const occupancy = new Map<string, number>();
  const busy = new Map<string, Set<string>>();
  const constraint = (id: string | null) => {
    const pair = pairById(pairs, id);
    if (!pair || pair.preferredSlotIds.length === 0) return 0;
    return 100 - pair.preferredSlotIds.length;
  };
  const ordered = [...matches].sort((a, b) => {
    const concreteA = a.pairAId && a.pairBId ? 1 : 0;
    const concreteB = b.pairAId && b.pairBId ? 1 : 0;
    if (concreteA !== concreteB) return concreteB - concreteA;
    return constraint(b.pairAId) + constraint(b.pairBId) - (constraint(a.pairAId) + constraint(a.pairBId));
  });

  for (const match of ordered) {
    if (match.status === 'bye') continue;
    if (!match.pairAId && !match.pairBId) continue;
    const left = pairById(pairs, match.pairAId);
    const right = pairById(pairs, match.pairBId);
    let best: TimeSlot | null = null;
    let bestScore = -Infinity;
    for (const slot of slots) {
      if ((occupancy.get(slot.id) ?? 0) >= courtCount) continue;
      const taken = busy.get(slot.id) ?? new Set<string>();
      if ((match.pairAId && taken.has(match.pairAId)) || (match.pairBId && taken.has(match.pairBId))) continue;
      const score = slotScore(slot, left, right);
      if (score > bestScore) {
        best = slot;
        bestScore = score;
      }
    }
    if (!best) continue;
    match.slotId = best.id;
    match.court = (occupancy.get(best.id) ?? 0) + 1;
    occupancy.set(best.id, match.court);
    const taken = busy.get(best.id) ?? new Set<string>();
    if (match.pairAId) taken.add(match.pairAId);
    if (match.pairBId) taken.add(match.pairBId);
    busy.set(best.id, taken);
  }

  return matches;
}

export function whatsAppUrl(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
