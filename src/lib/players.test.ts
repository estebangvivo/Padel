import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { displayName, exactPlayer, foldName, parsePlayers, searchPlayers, type DirectoryPlayer } from './players';

const PLAYERS: DirectoryPlayer[] = [
  { version: 1, id: 'a', name: 'Esteban', firstName: 'Esteban', lastName: '', phone: '', category: 8, categoryFloor: 8, createdAt: '', updatedAt: '' },
  { version: 1, id: 'b', name: 'Ana Gómez', firstName: 'Ana', lastName: 'Gómez', phone: '549111', category: 7, categoryFloor: 8, createdAt: '', updatedAt: '' },
];

describe('player directory', () => {
  it('finds a player ignoring accents and capital letters', () => {
    assert.equal(foldName('Ána'), 'ana');
    assert.deepEqual(searchPlayers(PLAYERS, 'gome').map((player) => player.id), ['b']);
    assert.equal(exactPlayer(PLAYERS, 'esteban')?.id, 'a');
    assert.equal(exactPlayer(PLAYERS, 'Esteban R'), undefined);
    assert.deepEqual(searchPlayers(PLAYERS, '549111').map((player) => player.id), ['b']);
    assert.equal(displayName('Ana', ''), 'Ana');
    assert.equal(displayName('Ana', 'Gómez'), 'Ana Gómez');
  });

  it('reads a player saved before categories existed as octava', () => {
    const raw = JSON.stringify([{ version: 1, id: 'a', name: 'Ana', createdAt: '', updatedAt: '' }]);
    assert.equal(parsePlayers(raw)[0]?.category, 8);
    assert.equal(parsePlayers(raw)[0]?.categoryFloor, 8);
    assert.equal(parsePlayers(raw)[0]?.firstName, 'Ana');
    assert.equal(parsePlayers(raw)[0]?.lastName, '');
    assert.equal(parsePlayers(raw)[0]?.phone, '');
  });
});
