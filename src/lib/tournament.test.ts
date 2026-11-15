import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { acceptMatchScore, buildSlots, createFixture, eachDate, isHardDay, isLegalSet, parseSetScores, scoreForWinner, setsForBracket, type Pair, type TimeSlot } from './tournament';

function pair(id: string, preferred: string[] = []): Pair {
  return { id, playerA: id, playerB: '', phone: '', preferredSlotIds: preferred };
}

function slot(date: string, start: string): TimeSlot {
  return { id: `${date}_${start}`, date, start, end: '10:30' };
}

describe('tournament fixture', () => {
  it('builds one slot per match length inside the day', () => {
    const slots = buildSlots([{ date: '2026-11-16', start: '09:00', end: '12:00' }], 90);
    assert.deepEqual(
      slots.map((item) => item.start),
      ['09:00', '10:30'],
    );
  });

  it('splits a score written with spaces or commas into sets', () => {
    assert.deepEqual(parseSetScores('6-3 6-2'), [
      { a: '6', b: '3' },
      { a: '6', b: '2' },
    ]);
    assert.deepEqual(parseSetScores('6-3, 6-2'), [
      { a: '6', b: '3' },
      { a: '6', b: '2' },
    ]);
    assert.deepEqual(parseSetScores('7-6(5), 6-4'), [
      { a: '7', b: '6(5)' },
      { a: '6', b: '4' },
    ]);
    assert.deepEqual(parseSetScores(''), []);
    assert.equal(parseSetScores('retirado'), null);
  });

  it('rejects a set that is not won by two once it goes past 6-4', () => {
    assert.equal(isLegalSet(6, 1), true);
    assert.equal(isLegalSet(7, 5), true);
    assert.equal(isLegalSet(7, 6), true);
    assert.equal(isLegalSet(8, 6), true);
    assert.equal(isLegalSet(8, 16), false);
    assert.equal(isLegalSet(6, 5), false);
    assert.equal(isLegalSet(7, 4), false);
    const bad = acceptMatchScore(
      [
        { a: '6', b: '1' },
        { a: '1', b: '6' },
        { a: '6', b: '1' },
        { a: '6', b: '1' },
        { a: '8', b: '16' },
      ],
      3,
    );
    assert.equal('kind' in bad && bad.kind, 'extra');
    const illegal = acceptMatchScore([{ a: '8', b: '16' }], 1);
    assert.equal('kind' in illegal && illegal.kind, 'set');
    const decided = acceptMatchScore(
      [
        { a: '6', b: '1' },
        { a: '3', b: '6' },
        { a: '7', b: '5' },
      ],
      3,
    );
    assert.equal('score' in decided && decided.winner, 'a');
  });

  it('puts the injury score on the winner and shows each pair its games', () => {
    assert.equal(scoreForWinner('6-3, 6-3', false), '3-6, 3-6');
    assert.deepEqual(setsForBracket('6-3 6-2', 'finished', true), [
      { a: '6', b: '3' },
      { a: '6', b: '2' },
    ]);
    assert.deepEqual(setsForBracket('6-3, 6-3', 'walkover', false), [
      { a: '3', b: '6' },
      { a: '3', b: '6' },
    ]);
  });

  it('lists every day from the start through the end', () => {
    assert.deepEqual(eachDate('2026-11-30', '2026-12-02'), ['2026-11-30', '2026-12-01', '2026-12-02']);
    assert.deepEqual(eachDate('2026-11-15', '2026-11-15'), ['2026-11-15']);
  });

  it('marks Friday and Saturday as the hard days', () => {
    assert.equal(isHardDay('2026-11-13'), true);
    assert.equal(isHardDay('2026-11-14'), true);
    assert.equal(isHardDay('2026-11-15'), false);
  });

  it('keeps Friday free when a weekday slot is available', () => {
    const monday = slot('2026-11-16', '10:00');
    const friday = slot('2026-11-13', '10:00');
    const matches = createFixture([pair('A'), pair('B')], [friday, monday], 1, 'roundRobin');
    assert.equal(matches.length, 1);
    assert.equal(matches[0]?.slotId, monday.id);
    assert.equal(matches[0]?.court, 1);
  });

  it('uses Saturday when both pairs prefer it', () => {
    const monday = slot('2026-11-16', '10:00');
    const saturday = slot('2026-11-14', '10:00');
    const matches = createFixture(
      [pair('A', [saturday.id]), pair('B', [saturday.id])],
      [monday, saturday],
      1,
      'roundRobin',
    );
    assert.equal(matches[0]?.slotId, saturday.id);
  });

  it('does not put the same pair on two courts at the same time', () => {
    const only = slot('2026-11-16', '10:00');
    const matches = createFixture([pair('A'), pair('B'), pair('C'), pair('D')], [only], 4, 'roundRobin');
    const placed = matches.filter((match) => match.slotId === only.id);
    const seen = new Set<string>();
    for (const match of placed) {
      assert.equal(seen.has(match.pairAId || ''), false);
      assert.equal(seen.has(match.pairBId || ''), false);
      if (match.pairAId) seen.add(match.pairAId);
      if (match.pairBId) seen.add(match.pairBId);
    }
    assert.equal(placed.length, 2);
  });

  it('plays a full round robin', () => {
    const slots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'].map((start) => slot('2026-11-16', start));
    const matches = createFixture([pair('A'), pair('B'), pair('C'), pair('D')], slots, 1, 'roundRobin');
    assert.equal(matches.length, 6);
    assert.equal(matches.filter((match) => match.slotId).length, 6);
  });

  it('gives byes in a knockout when the pairs are not a power of two', () => {
    const slots = ['09:00', '10:00', '11:00'].map((start) => slot('2026-11-16', start));
    const matches = createFixture([pair('A'), pair('B'), pair('C')], slots, 1, 'knockout');
    const byes = matches.filter((match) => match.status === 'bye');
    assert.equal(byes.length, 1);
    assert.equal(matches.filter((match) => match.round === 1 && match.status === 'scheduled').length, 1);
    const final = matches.find((match) => match.round === 2);
    assert.ok(final?.pairAId || final?.pairBId);
  });
});
