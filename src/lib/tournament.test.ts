import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSlots, createFixture, eachDate, isHardDay, type Pair, type TimeSlot } from './tournament';

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
