import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PresentCopy } from './present';
import type { MatchConfig, MatchState } from './scoringEngine';
import { buildWearSnapshot, interpretWearCommand } from './wearScore';

const copy: PresentCopy = {
  playerN: (n) => `Jugador ${n}`,
  playerLetter: (letter) => `Jugador ${letter}`,
  pairN: (n) => `Pareja ${n}`,
  setChip: (n) => `SET ${n}`,
  superChip: 'SÚPER',
  alerts: {
    matchPoint: 'MATCH POINT',
    setPoint: 'SET POINT',
    breakPoint: 'BREAK POINT',
    goldenPoint: 'PUNTO DE ORO',
    tiebreak: 'TIE-BREAK',
    superTiebreak: 'SÚPER TIE-BREAK',
  },
  result: 'Resultado:',
  beat: 'venció a',
  by: 'por',
  padel: 'Pádel',
  tennis: 'Tenis',
};

const config: MatchConfig = {
  sport: 'padel',
  format: 'doubles',
  teams: [{ players: ['Ana', 'Bea'] }, { players: ['Carlos', 'Dani'] }],
  setsFormat: 3,
  deuceRule: 'advantage',
  decidingSuperTiebreak: false,
  initialServerTeam: 1,
  serverOrder: [
    [0, 1],
    [0, 1],
  ],
};

const live: MatchState = {
  sets: [],
  games: [5, 0],
  points: [3, 0],
  phase: 'regular',
  serveGameIndex: 5,
  status: 'live',
  winner: null,
  changeOfEnds: false,
};

describe('wear score', () => {
  it('reads a point for each side and a hold as undo', () => {
    assert.equal(interpretWearCommand('0'), 0);
    assert.equal(interpretWearCommand('1'), 1);
    assert.equal(interpretWearCommand('u'), 'undo');
    assert.equal(interpretWearCommand('mute'), null);
  });

  it('asks to open a match when the phone has none', () => {
    const snapshot = buildWearSnapshot(null, copy, { idle: 'Abrí un partido', finished: 'Terminado' });
    assert.equal(snapshot.status, 'idle');
    assert.equal(snapshot.headline, 'Abrí un partido');
  });

  it('sends the live points, games and the names of both sides', () => {
    const snapshot = buildWearSnapshot({ config, state: live }, copy, { idle: 'Abrí un partido', finished: 'Terminado' });
    assert.equal(snapshot.status, 'live');
    assert.equal(snapshot.left, 'Ana / Bea');
    assert.equal(snapshot.right, 'Carlos / Dani');
    assert.equal(snapshot.leftPoints, '40');
    assert.equal(snapshot.rightPoints, '0');
    assert.equal(snapshot.games, '5-0');
    assert.equal(snapshot.sets, '0-0');
    assert.equal(snapshot.headline, 'SET 1');
    assert.equal(snapshot.serving, 0);
  });
});
