import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { titlesByPlayer, titlesInCategory, tournamentChampions, withPromotion } from './titles';
import type { FixtureMatch, Pair, Tournament } from './tournament';

function pair(id: string, playerAId: string | null = null, playerBId: string | null = null): Pair {
  return { id, playerA: id, playerB: '', phone: '', playerAId, playerBId, preferredSlotIds: [] };
}

function match(partial: Partial<FixtureMatch> & Pick<FixtureMatch, 'id' | 'pairAId' | 'pairBId'>): FixtureMatch {
  return {
    round: 1,
    position: 0,
    winnerId: null,
    court: null,
    slotId: null,
    status: 'scheduled',
    score: '',
    nextMatchId: null,
    nextSlot: null,
    ...partial,
  };
}

function cup(format: Tournament['format'], category: Tournament['category'], pairs: Pair[], matches: FixtureMatch[]): Tournament {
  return {
    version: 1,
    id: `cup-${category}-${matches.length}`,
    name: 'Copa',
    category,
    courts: 1,
    matchMinutes: 90,
    format,
    walkoverScore: '6-3, 6-3',
    downloadUrl: '',
    days: [],
    slots: [],
    pairs,
    matches,
  };
}

const player = { category: 8 as const, categoryFloor: 8 as const };

describe('tournament champions', () => {
  it('waits for the final and then crowns its winner', () => {
    const open = cup('knockout', 8, [pair('A'), pair('B')], [
      match({ id: 'sf', pairAId: 'A', pairBId: 'B', winnerId: 'A', status: 'finished', score: '6-3, 6-2', round: 1 }),
      match({ id: 'f', pairAId: 'A', pairBId: null, round: 2 }),
    ]);
    assert.deepEqual(tournamentChampions(open), []);
    const closed = cup('knockout', 8, [pair('A'), pair('B')], [
      match({ id: 'f', pairAId: 'A', pairBId: 'B', winnerId: 'B', status: 'walkover', score: '6-3, 6-3', round: 2 }),
    ]);
    assert.deepEqual(tournamentChampions(closed), ['B']);
  });

  it('crowns the round robin only when every match has a winner', () => {
    const pending = cup('roundRobin', 8, [pair('A'), pair('B')], [
      match({ id: 'm', pairAId: 'A', pairBId: 'B', status: 'scheduled' }),
    ]);
    assert.deepEqual(tournamentChampions(pending), []);
    const done = cup('roundRobin', 8, [pair('A'), pair('B')], [
      match({ id: 'm', pairAId: 'A', pairBId: 'B', winnerId: 'A', status: 'finished', score: '6-4, 6-4' }),
    ]);
    assert.deepEqual(tournamentChampions(done), ['A']);
  });

  it('uses the match between the tied pairs before the score difference', () => {
    const matches = [
      match({ id: 'ab', pairAId: 'A', pairBId: 'B', winnerId: 'A', status: 'finished', score: '6-4, 6-4' }),
      match({ id: 'ac', pairAId: 'A', pairBId: 'C', winnerId: 'A', status: 'finished', score: '6-0, 6-0' }),
      match({ id: 'bc', pairAId: 'B', pairBId: 'C', winnerId: 'B', status: 'finished', score: '6-0, 6-0' }),
      match({ id: 'bd', pairAId: 'B', pairBId: 'D', winnerId: 'B', status: 'finished', score: '6-0, 6-0' }),
      match({ id: 'da', pairAId: 'D', pairBId: 'A', winnerId: 'D', status: 'finished', score: '6-0, 6-0' }),
    ];
    assert.deepEqual(tournamentChampions(cup('roundRobin', 7, [], matches)), ['A']);
  });
});

describe('promotion', () => {
  it('moves a player up after three titles and keeps the old category closed', () => {
    const titles = { 8: 3 } as const;
    const promoted = withPromotion(player, titles);
    assert.equal(promoted.category, 7);
    assert.equal(promoted.categoryFloor, 7);
    assert.equal(titlesInCategory(titles, promoted.category), 0);
    assert.equal(withPromotion(promoted, {}).categoryFloor, 7);
  });

  it('does not drop a player who was already better than the new floor', () => {
    const stayed = withPromotion({ category: 4 as const, categoryFloor: 8 as const }, { 8: 3 });
    assert.equal(stayed.category, 4);
    assert.equal(stayed.categoryFloor, 7);
  });

  it('stays in primera and keeps counting titles there', () => {
    const elite = withPromotion({ category: 1 as const, categoryFloor: 1 as const }, { 1: 4 });
    assert.equal(elite.category, 1);
    assert.equal(elite.categoryFloor, 1);
    assert.equal(titlesInCategory({ 1: 4 }, 1), 4);
  });

  it('counts one title per champion player in the tournament category', () => {
    const tournaments = [8, 8, 7].map((category, index) =>
      cup('knockout', category as 8 | 7, [pair('A', 'lucia', 'teo')], [
        match({
          id: `f${index}`,
          pairAId: 'A',
          pairBId: 'B',
          winnerId: 'A',
          status: 'finished',
          score: '6-3, 6-3',
          round: 1,
        }),
      ]),
    );
    const table = titlesByPlayer(tournaments);
    assert.equal(table.get('lucia')?.[8], 2);
    assert.equal(table.get('lucia')?.[7], 1);
    assert.equal(table.get('teo')?.[8], 2);
  });
});
