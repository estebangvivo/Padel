import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canEnterCategory, categoryConflict, parseCategory } from './category';

describe('player categories', () => {
  it('defaults a missing category to octava', () => {
    assert.equal(parseCategory(undefined), 8);
    assert.equal(parseCategory(''), 8);
    assert.equal(parseCategory(9), 8);
    assert.equal(parseCategory('7'), 7);
  });

  it('keeps a higher category out of a lower tournament', () => {
    assert.equal(canEnterCategory(7, 8), false);
    assert.equal(canEnterCategory(1, 8), false);
    assert.equal(canEnterCategory(8, 8), true);
    assert.equal(canEnterCategory(8, 7), true);
    assert.equal(canEnterCategory(4, 4), true);
  });

  it('finds the player who cannot enter', () => {
    const players = [
      { id: 'low', category: 8 as const },
      { id: 'high', category: 7 as const },
    ];
    assert.equal(categoryConflict(['low', 'high'], players, 8)?.id, 'high');
    assert.equal(categoryConflict(['low'], players, 8), null);
    assert.equal(categoryConflict(['high'], players, 7), null);
  });
});
