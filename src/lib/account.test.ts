import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createAccount, parseAccount, placeAccountOnPair, type PlayerAccount } from './account';

const SAVED: PlayerAccount = {
  version: 1,
  id: 'player_saved',
  name: 'Ana',
  phone: '5491111111111',
  category: 8,
  categoryFloor: 8,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

describe('player account', () => {
  it('keeps the same id when the name changes', () => {
    const next = createAccount('Ana Gómez', '5491122222222', 4, SAVED);
    assert.equal(next.id, SAVED.id);
    assert.equal(next.createdAt, SAVED.createdAt);
    assert.equal(next.name, 'Ana Gómez');
    assert.equal(next.category, 4);
    assert.equal(next.categoryFloor, 8);
    const locked = createAccount('Ana', SAVED.phone, 8, { ...SAVED, category: 7, categoryFloor: 7 });
    assert.equal(locked.category, 7);
    assert.equal(locked.categoryFloor, 7);
    assert.equal(createAccount('Ana', SAVED.phone, undefined, SAVED).category, 8);
    assert.notEqual(next.updatedAt, SAVED.updatedAt);
  });

  it('reads a saved profile and ignores a broken one', () => {
    assert.deepEqual(parseAccount(JSON.stringify(SAVED)), SAVED);
    assert.equal(parseAccount(null), null);
    assert.equal(parseAccount('{'), null);
    assert.equal(parseAccount(JSON.stringify({ version: 1, id: '', name: 'Ana' })), null);
    const legacy = { version: 1, id: 'player_saved', name: 'Ana', phone: '', createdAt: SAVED.createdAt, updatedAt: SAVED.updatedAt };
    assert.equal(parseAccount(JSON.stringify(legacy))?.category, 8);
  });

  it('puts this phone on the first empty player of a pair', () => {
    const empty = { playerA: '', playerB: '', phone: '' };
    const onA = placeAccountOnPair(empty, SAVED);
    assert.equal(onA.playerA, 'Ana');
    assert.equal(onA.playerAId, SAVED.id);
    assert.equal(onA.phone, SAVED.phone);

    const onB = placeAccountOnPair({ playerA: 'Luis', playerB: '', phone: '5491100000000' }, SAVED);
    assert.equal(onB.playerB, 'Ana');
    assert.equal(onB.playerBId, SAVED.id);
    assert.equal(onB.phone, '5491100000000');
    assert.equal(placeAccountOnPair(onA, SAVED), onA);
  });
});
