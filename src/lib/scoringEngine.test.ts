import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildShareMessage, formatSetScore, teamLabel } from './present';
import {
  applyConfigToState,
  awardPoint,
  configToSetupInput,
  createInitialState,
  createMatchConfig,
  getAlerts,
  getCurrentServer,
  pointLabel,
  type MatchConfig,
  type MatchState,
  type SetupInput,
  type TeamIndex,
} from './scoringEngine';
import { formatClock, readElapsed } from './timer';

function setup(overrides: Partial<SetupInput> = {}): MatchConfig {
  return createMatchConfig({
    sport: 'padel',
    format: 'singles',
    names: [
      ['Ana', ''],
      ['Luis', ''],
    ],
    setsFormat: 3,
    deuceRule: 'advantage',
    decidingSuperTiebreak: false,
    initialServerTeam: 0,
    initialServerPlayer: 0,
    opponentFirstServer: 0,
    ...overrides,
  });
}

function times(team: TeamIndex, count: number): TeamIndex[] {
  return Array.from({ length: count }, () => team);
}

function play(config: MatchConfig, state: MatchState, points: readonly TeamIndex[]): MatchState {
  return points.reduce((current, team) => awardPoint(config, current, team), state);
}

function hold(config: MatchConfig, state: MatchState, team: TeamIndex): MatchState {
  return play(config, state, times(team, 4));
}

function bagel(config: MatchConfig, state: MatchState, team: TeamIndex): MatchState {
  let current = state;
  for (let game = 0; game < 6; game += 1) current = hold(config, current, team);
  return current;
}

function toSixAll(config: MatchConfig, state: MatchState): MatchState {
  let current = state;
  for (let game = 0; game < 6; game += 1) {
    current = hold(config, current, 0);
    current = hold(config, current, 1);
  }
  return current;
}

describe('games, advantage and golden point', () => {
  it('shows 0, 15, 30 and 40', () => {
    const config = setup();
    let state = createInitialState();
    assert.equal(pointLabel(config, state, 0), '0');
    state = awardPoint(config, state, 0);
    assert.equal(pointLabel(config, state, 0), '15');
    state = awardPoint(config, state, 0);
    assert.equal(pointLabel(config, state, 0), '30');
    state = awardPoint(config, state, 0);
    assert.equal(pointLabel(config, state, 0), '40');
  });

  it('returns from advantage to deuce and then wins the game', () => {
    const config = setup();
    let state = play(config, createInitialState(), [0, 0, 0, 1, 1, 1]);
    assert.deepEqual(state.points, [3, 3]);
    assert.equal(pointLabel(config, state, 0), '40');
    assert.equal(state.games[0], 0);

    state = awardPoint(config, state, 0);
    assert.equal(pointLabel(config, state, 0), 'AD');
    assert.equal(pointLabel(config, state, 1), '40');
    assert.equal(state.games[0], 0);

    state = awardPoint(config, state, 1);
    assert.deepEqual(state.points, [4, 4]);
    assert.equal(pointLabel(config, state, 0), '40');
    assert.equal(pointLabel(config, state, 1), '40');

    state = awardPoint(config, state, 0);
    state = awardPoint(config, state, 0);
    assert.deepEqual(state.games, [1, 0]);
    assert.deepEqual(state.points, [0, 0]);
  });

  it('lets the next point win the game on a golden point', () => {
    const config = setup({ deuceRule: 'golden' });
    let state = play(config, createInitialState(), [0, 0, 0, 1, 1, 1]);
    assert.deepEqual(state.points, [3, 3]);
    assert.ok(getAlerts(config, state).some((alert) => alert.type === 'goldenPoint'));

    state = awardPoint(config, state, 1);
    assert.deepEqual(state.games, [0, 1]);
    assert.deepEqual(state.points, [0, 0]);
    assert.equal(getAlerts(config, state).some((alert) => alert.type === 'goldenPoint'), false);
  });

  it('does not mark golden point before 40-40', () => {
    const config = setup({ deuceRule: 'golden' });
    const state = play(config, createInitialState(), [0, 0, 0, 1, 1]);
    assert.equal(pointLabel(config, state, 0), '40');
    assert.equal(pointLabel(config, state, 1), '30');
    assert.equal(getAlerts(config, state).some((alert) => alert.type === 'goldenPoint'), false);
  });

  it('does not mutate the previous state', () => {
    const config = setup();
    const state = createInitialState();
    const snapshot = structuredClone(state);
    const next = awardPoint(config, state, 0);
    assert.deepEqual(state, snapshot);
    assert.notEqual(next, state);
    assert.deepEqual(next.points, [1, 0]);
  });
});

describe('sets and tie-breaks', () => {
  it('wins a set 6-0 and a set 6-4, and continues from 6-5 to 7-5', () => {
    const config = setup();
    const bagelSet = bagel(config, createInitialState(), 0);
    assert.equal(bagelSet.sets.length, 1);
    assert.deepEqual(bagelSet.sets[0]?.games, [6, 0]);
    assert.equal(bagelSet.status, 'live');

    let sixFour = createInitialState();
    for (let game = 0; game < 4; game += 1) sixFour = hold(config, sixFour, 1);
    for (let game = 0; game < 6; game += 1) sixFour = hold(config, sixFour, 0);
    assert.deepEqual(sixFour.sets[0]?.games, [6, 4]);

    let sevenFive = createInitialState();
    for (let game = 0; game < 5; game += 1) {
      sevenFive = hold(config, sevenFive, 0);
      sevenFive = hold(config, sevenFive, 1);
    }
    sevenFive = hold(config, sevenFive, 0);
    assert.equal(sevenFive.phase, 'regular');
    assert.deepEqual(sevenFive.games, [6, 5]);
    sevenFive = hold(config, sevenFive, 0);
    assert.deepEqual(sevenFive.sets[0]?.games, [7, 5]);
  });

  it('enters a tie-break at 6-6 and requires a two-point margin', () => {
    const config = setup();
    const sixAll = toSixAll(config, createInitialState());
    assert.equal(sixAll.phase, 'tiebreak');
    assert.deepEqual(sixAll.points, [0, 0]);
    assert.deepEqual(sixAll.games, [6, 6]);
    assert.equal(sixAll.changeOfEnds, false);
    assert.ok(getAlerts(config, sixAll).some((alert) => alert.type === 'tiebreak'));

    const sevenSix = play(config, sixAll, [...times(0, 6), ...times(1, 6), 0]);
    assert.equal(sevenSix.phase, 'tiebreak');
    assert.deepEqual(sevenSix.points, [7, 6]);
    assert.equal(sevenSix.status, 'live');

    const eightSix = play(config, sixAll, [...times(0, 6), ...times(1, 6), 0, 0]);
    assert.equal(eightSix.sets.length, 1);
    assert.deepEqual(eightSix.sets[0]?.games, [7, 6]);
    assert.deepEqual(eightSix.sets[0]?.tiebreak, [8, 6]);
    assert.equal(formatSetScore(eightSix.sets[0]!), '7-6(6)');
  });

  it('records a 7-5 tie-break as 7-6(5) and an extended 10-8', () => {
    const config = setup();
    const sixAll = toSixAll(config, createInitialState());
    const sevenFive = play(config, sixAll, [...times(1, 5), ...times(0, 7)]);
    assert.equal(formatSetScore(sevenFive.sets[0]!), '7-6(5)');
    assert.equal(sevenFive.changeOfEnds, true);
    assert.equal(sevenFive.serveGameIndex, 13);

    const tenEight = play(config, sixAll, [
      ...times(0, 6),
      ...times(1, 6),
      0, 1, 0, 1, 0, 0,
    ]);
    assert.deepEqual(tenEight.sets[0]?.tiebreak, [10, 8]);
    assert.equal(formatSetScore(tenEight.sets[0]!), '7-6(8)');
  });

  it('ends a best-of-one match on the first set and ignores later points', () => {
    const config = setup({ setsFormat: 1 });
    const done = bagel(config, createInitialState(), 1);
    assert.equal(done.status, 'finished');
    assert.equal(done.winner, 1);
    const ignored = awardPoint(config, done, 0);
    assert.equal(ignored, done);
  });

  it('needs two sets to win a best of three', () => {
    const config = setup({ setsFormat: 3 });
    let state = bagel(config, createInitialState(), 0);
    assert.equal(state.status, 'live');
    state = bagel(config, state, 0);
    assert.equal(state.status, 'finished');
    assert.equal(state.winner, 0);
    assert.equal(state.sets.length, 2);
  });
});

describe('service rotation', () => {
  it('alternates singles servers every game and keeps the server inside a game', () => {
    const config = setup();
    let state = createInitialState();
    assert.deepEqual(getCurrentServer(config, state), { team: 0, playerIndex: 0 });
    state = awardPoint(config, state, 0);
    assert.equal(getCurrentServer(config, state).team, 0);
    state = hold(config, createInitialState(), 0);
    assert.equal(getCurrentServer(config, state).team, 1);
    state = hold(config, state, 1);
    assert.equal(getCurrentServer(config, state).team, 0);
  });

  it('rotates doubles servers in partner order', () => {
    const config = setup({
      format: 'doubles',
      names: [
        ['Ana', 'Belén'],
        ['Carlos', 'Dani'],
      ],
      initialServerTeam: 0,
      initialServerPlayer: 0,
      opponentFirstServer: 0,
    });
    assert.deepEqual(config.serverOrder, [
      [0, 1],
      [0, 1],
    ]);

    let state = createInitialState();
    assert.deepEqual(getCurrentServer(config, state), { team: 0, playerIndex: 0 });
    state = hold(config, state, 0);
    assert.deepEqual(getCurrentServer(config, state), { team: 1, playerIndex: 0 });
    state = hold(config, state, 1);
    assert.deepEqual(getCurrentServer(config, state), { team: 0, playerIndex: 1 });
    state = hold(config, state, 0);
    assert.deepEqual(getCurrentServer(config, state), { team: 1, playerIndex: 1 });
    state = hold(config, state, 1);
    assert.deepEqual(getCurrentServer(config, state), { team: 0, playerIndex: 0 });
  });

  it('starts from the chosen doubles server and the chosen opponent', () => {
    const config = setup({
      format: 'doubles',
      names: [
        ['Ana', 'Belén'],
        ['Carlos', 'Dani'],
      ],
      initialServerTeam: 1,
      initialServerPlayer: 1,
      opponentFirstServer: 0,
    });
    assert.deepEqual(config.serverOrder[1], [1, 0]);
    assert.deepEqual(config.serverOrder[0], [0, 1]);

    let state = createInitialState();
    assert.deepEqual(getCurrentServer(config, state), { team: 1, playerIndex: 1 });
    state = hold(config, state, 1);
    assert.deepEqual(getCurrentServer(config, state), { team: 0, playerIndex: 0 });
    state = hold(config, state, 0);
    assert.deepEqual(getCurrentServer(config, state), { team: 1, playerIndex: 0 });
  });

  it('serves one point and then two points in a tie-break, and the receiver starts the next set', () => {
    const config = setup({
      format: 'doubles',
      names: [
        ['Ana', 'Belén'],
        ['Carlos', 'Dani'],
      ],
    });
    let state = toSixAll(config, createInitialState());
    assert.equal(state.serveGameIndex, 12);

    const servers = [];
    for (let point = 0; point < 6; point += 1) {
      servers.push(getCurrentServer(config, state));
      state = awardPoint(config, state, 0);
    }

    assert.deepEqual(servers, [
      { team: 0, playerIndex: 0 },
      { team: 1, playerIndex: 0 },
      { team: 1, playerIndex: 0 },
      { team: 0, playerIndex: 1 },
      { team: 0, playerIndex: 1 },
      { team: 1, playerIndex: 1 },
    ]);

    const finished = play(config, toSixAll(config, createInitialState()), times(0, 7));
    assert.equal(finished.serveGameIndex, 13);
    assert.deepEqual(getCurrentServer(config, finished), { team: 1, playerIndex: 0 });
  });
});

describe('change of ends', () => {
  it('flags an odd game total and clears it on the next point', () => {
    const config = setup();
    let state = hold(config, createInitialState(), 0);
    assert.equal(state.changeOfEnds, true);
    state = awardPoint(config, state, 0);
    assert.equal(state.changeOfEnds, false);
    state = play(config, state, times(0, 3));
    assert.deepEqual(state.games, [2, 0]);
    assert.equal(state.changeOfEnds, false);
  });

  it('flags odd completed sets and skips even ones', () => {
    const config = setup();
    let odd = createInitialState();
    for (let game = 0; game < 3; game += 1) odd = hold(config, odd, 1);
    for (let game = 0; game < 6; game += 1) odd = hold(config, odd, 0);
    assert.deepEqual(odd.sets[0]?.games, [6, 3]);
    assert.equal(odd.changeOfEnds, true);

    let even = createInitialState();
    for (let game = 0; game < 4; game += 1) even = hold(config, even, 1);
    for (let game = 0; game < 6; game += 1) even = hold(config, even, 0);
    assert.deepEqual(even.sets[0]?.games, [6, 4]);
    assert.equal(even.changeOfEnds, false);
  });

  it('changes ends every six tie-break points while the tie-break is live', () => {
    const config = setup();
    const sixAll = toSixAll(config, createInitialState());
    const five = play(config, sixAll, [...times(0, 3), ...times(1, 2)]);
    assert.equal(five.points[0] + five.points[1], 5);
    assert.equal(five.changeOfEnds, false);

    const six = awardPoint(config, five, 1);
    assert.equal(six.points[0] + six.points[1], 6);
    assert.equal(six.changeOfEnds, true);

    const seven = awardPoint(config, six, 0);
    assert.equal(seven.changeOfEnds, false);
    assert.equal(seven.phase, 'tiebreak');
  });
});

describe('match points, break points and the deciding super tie-break', () => {
  it('distinguishes match point from set point', () => {
    const decisive = setup({ setsFormat: 1 });
    let state = createInitialState();
    for (let game = 0; game < 5; game += 1) state = hold(decisive, state, 0);
    state = play(decisive, state, times(0, 3));
    const alerts = getAlerts(decisive, state);
    assert.ok(alerts.some((alert) => alert.type === 'matchPoint' && alert.team === 0));
    assert.equal(alerts.some((alert) => alert.type === 'setPoint'), false);

    const longer = setup({ setsFormat: 3 });
    let early = createInitialState();
    for (let game = 0; game < 5; game += 1) early = hold(longer, early, 0);
    early = play(longer, early, times(0, 3));
    const earlyAlerts = getAlerts(longer, early);
    assert.ok(earlyAlerts.some((alert) => alert.type === 'setPoint' && alert.team === 0));
    assert.equal(earlyAlerts.some((alert) => alert.type === 'matchPoint'), false);
  });

  it('marks a break point only for the receiving team, including advantage', () => {
    const config = setup();
    const loveForty = play(config, createInitialState(), times(1, 3));
    const broken = getAlerts(config, loveForty);
    assert.ok(broken.some((alert) => alert.type === 'breakPoint' && alert.team === 1));
    assert.equal(broken.some((alert) => alert.type === 'breakPoint' && alert.team === 0), false);

    const holding = play(config, createInitialState(), times(0, 3));
    assert.equal(getAlerts(config, holding).some((alert) => alert.type === 'breakPoint'), false);

    const advantage = play(config, createInitialState(), [1, 1, 1, 0, 0, 0, 1]);
    assert.equal(pointLabel(config, advantage, 1), 'AD');
    assert.ok(getAlerts(config, advantage).some((alert) => alert.type === 'breakPoint' && alert.team === 1));
  });

  it('shows set point in a tie-break without calling it a break', () => {
    const config = setup();
    const state = play(config, toSixAll(config, createInitialState()), [...times(0, 6), ...times(1, 4)]);
    assert.deepEqual(state.points, [6, 4]);
    const alerts = getAlerts(config, state);
    assert.ok(alerts.some((alert) => alert.type === 'setPoint' && alert.team === 0));
    assert.equal(alerts.some((alert) => alert.type === 'breakPoint'), false);
    assert.equal(alerts.some((alert) => alert.type === 'setPoint' && alert.team === 1), false);

    const level = play(config, state, times(1, 2));
    assert.deepEqual(level.points, [6, 6]);
    assert.equal(getAlerts(config, level).some((alert) => alert.type === 'setPoint'), false);
  });

  it('combines golden point with break point for the receiver', () => {
    const config = setup({ deuceRule: 'golden' });
    const deuce = play(config, createInitialState(), [0, 0, 0, 1, 1, 1]);
    const alerts = getAlerts(config, deuce);
    assert.ok(alerts.some((alert) => alert.type === 'goldenPoint'));
    assert.ok(alerts.some((alert) => alert.type === 'breakPoint' && alert.team === 1));
    assert.equal(alerts.some((alert) => alert.type === 'breakPoint' && alert.team === 0), false);
  });

  it('plays a super tie-break to 11 at 6-6 and still plays the deciding set', () => {
    const config = setup({ decidingSuperTiebreak: true, setsFormat: 3 });
    let state = bagel(config, createInitialState(), 0);
    state = bagel(config, state, 1);
    assert.equal(state.phase, 'regular');
    assert.equal(state.status, 'live');
    assert.deepEqual(state.games, [0, 0]);

    const sixAll = toSixAll(config, state);
    assert.equal(sixAll.phase, 'superTiebreak');
    assert.deepEqual(sixAll.games, [6, 6]);
    assert.ok(getAlerts(config, sixAll).some((alert) => alert.type === 'superTiebreak'));

    const tenNine = play(config, sixAll, [...times(1, 9), ...times(0, 10)]);
    assert.deepEqual(tenNine.points, [10, 9]);
    assert.equal(tenNine.phase, 'superTiebreak');
    assert.equal(tenNine.status, 'live');
    assert.ok(getAlerts(config, tenNine).some((alert) => alert.type === 'matchPoint' && alert.team === 0));

    const level = awardPoint(config, tenNine, 1);
    assert.deepEqual(level.points, [10, 10]);
    assert.equal(getAlerts(config, level).some((alert) => alert.type === 'matchPoint'), false);

    const won = play(config, sixAll, [...times(1, 9), ...times(0, 11)]);
    assert.equal(won.status, 'finished');
    assert.equal(won.winner, 0);
    assert.equal(won.sets.length, 3);
    assert.equal(won.sets[2]?.superTiebreak, true);
    assert.deepEqual(won.sets[2]?.games, [7, 6]);
    assert.deepEqual(won.sets[2]?.tiebreak, [11, 9]);
    assert.equal(formatSetScore(won.sets[2]!), '7-6(9)');

    const extended = play(config, level, [0, 0]);
    assert.equal(extended.status, 'finished');
    assert.deepEqual(extended.sets[2]?.tiebreak, [12, 10]);
    assert.equal(formatSetScore(extended.sets[2]!), '7-6(10)');
  });

  it('keeps a best of five on a full set at 1-1 and uses the super tie-break only at 6-6', () => {
    const config = setup({ setsFormat: 5, decidingSuperTiebreak: true });
    let state = bagel(config, createInitialState(), 0);
    state = bagel(config, state, 1);
    assert.equal(state.phase, 'regular');
    state = toSixAll(config, state);
    assert.equal(state.phase, 'superTiebreak');
    assert.equal(state.sets.length, 2);
  });

  it('allows a super tie-break in a one-set match', () => {
    const config = setup({ setsFormat: 1, decidingSuperTiebreak: true });
    assert.equal(config.decidingSuperTiebreak, true);
    const sixAll = toSixAll(config, createInitialState());
    assert.equal(sixAll.phase, 'superTiebreak');
  });
});

describe('undo snapshots and shared result', () => {
  it('restores every previous point, including a set boundary', () => {
    const config = setup({ setsFormat: 3 });
    const history: MatchState[] = [];
    let state = createInitialState();
    const sequence: TeamIndex[] = [...times(0, 24), 1];
    for (const team of sequence) {
      history.push(state);
      state = awardPoint(config, state, team);
    }
    assert.equal(state.sets.length, 1);

    for (let step = sequence.length - 1; step >= 0; step -= 1) {
      state = history.pop()!;
    }
    assert.deepEqual(state, createInitialState());
    assert.equal(history.length, 0);
  });

  it('uses empty doubles names as Pareja 1 and Pareja 2', () => {
    const config = setup({
      format: 'doubles',
      names: [
        ['', ''],
        ['', ''],
      ],
    });
    assert.equal(teamLabel(config, 0), 'Pareja 1');
    assert.equal(teamLabel(config, 1), 'Pareja 2');

    const state = createInitialState();
    state.sets = [
      { games: [6, 4], tiebreak: null, superTiebreak: false },
      { games: [3, 6], tiebreak: null, superTiebreak: false },
      { games: [11, 9], tiebreak: null, superTiebreak: true },
    ];
    state.status = 'finished';
    state.winner = 0;

    const message = buildShareMessage(config, state, 84 * 60 * 1000);
    assert.equal(
      message,
      '🎾 Resultado: Pareja 1 venció a Pareja 2 por 6-4, 3-6, 11-9\nPádel · 1:24:00',
    );
  });

  it('keeps the score when names, serve or deuce rule change', () => {
    const config = setup({
      format: 'doubles',
      names: [
        ['Ana', 'Belén'],
        ['Carlos', 'Dani'],
      ],
      deuceRule: 'advantage',
    });
    const state = play(config, createInitialState(), [0, 0, 0]);
    const edited = createMatchConfig({
      ...configToSetupInput(config),
      names: [
        ['Ana', 'Bea'],
        ['Carlos', 'Dani'],
      ],
      deuceRule: 'golden',
      initialServerTeam: 1,
      initialServerPlayer: 1,
    });

    const next = applyConfigToState(edited, state);
    assert.deepEqual(next.points, [3, 0]);
    assert.deepEqual(next.games, [0, 0]);
    assert.equal(next.serveGameIndex, 0);
    assert.equal(next.phase, 'regular');
    assert.equal(next.status, 'live');
    assert.notEqual(next, state);
  });

  it('round-trips doubles serve order through the setup form', () => {
    const input: SetupInput = {
      sport: 'tennis',
      format: 'doubles',
      names: [
        ['Ana', 'Belén'],
        ['Carlos', 'Dani'],
      ],
      setsFormat: 5,
      deuceRule: 'golden',
      decidingSuperTiebreak: true,
      initialServerTeam: 1,
      initialServerPlayer: 1,
      opponentFirstServer: 0,
    };
    assert.deepEqual(createMatchConfig(configToSetupInput(createMatchConfig(input))), createMatchConfig(input));
  });

  it('formats the match clock', () => {
    assert.equal(formatClock(0), '00:00');
    assert.equal(formatClock(65_000), '01:05');
    assert.equal(readElapsed({ accumulatedMs: 500, running: false, runningSince: null }, 9_000), 500);
    assert.equal(readElapsed({ accumulatedMs: 500, running: true, runningSince: 1_000 }, 6_000), 5_500);
  });
});

describe('editing a match that is already underway', () => {
  it('finishes the match when the new set format is already won', () => {
    const config = setup({ setsFormat: 3 });
    const state = bagel(config, createInitialState(), 0);
    const next = applyConfigToState({ ...config, setsFormat: 1 }, state);
    assert.equal(next.status, 'finished');
    assert.equal(next.winner, 0);
    assert.equal(next.sets.length, 1);
    assert.equal(state.status, 'live');
  });

  it('leaves a one-set lead live when the format still needs another set', () => {
    const config = setup({ setsFormat: 5 });
    const state = bagel(config, createInitialState(), 0);
    const next = applyConfigToState({ ...config, setsFormat: 3 }, state);
    assert.equal(next.status, 'live');
    assert.equal(next.winner, null);
    assert.deepEqual(next.games, [0, 0]);
  });

  it('uses the selected tie-break length at 6-6 before the first point', () => {
    const regular = setup({ setsFormat: 3, decidingSuperTiebreak: false });
    const sixAll = toSixAll(regular, createInitialState());
    assert.equal(sixAll.phase, 'tiebreak');

    const asSuper = applyConfigToState({ ...regular, decidingSuperTiebreak: true }, sixAll);
    assert.equal(asSuper.phase, 'superTiebreak');
    assert.deepEqual(asSuper.games, [6, 6]);
    assert.deepEqual(asSuper.points, [0, 0]);

    const started = awardPoint({ ...regular, decidingSuperTiebreak: true }, asSuper, 0);
    const unchanged = applyConfigToState(regular, started);
    assert.equal(unchanged.phase, 'superTiebreak');
    assert.deepEqual(unchanged.points, [1, 0]);
  });

  it('does not turn the start of a set into a tie-break', () => {
    const config = setup({ setsFormat: 3, decidingSuperTiebreak: true });
    const opening = applyConfigToState(config, createInitialState());
    assert.equal(opening.phase, 'regular');

    let tied = bagel(config, createInitialState(), 0);
    tied = bagel(config, tied, 1);
    assert.equal(tied.phase, 'regular');
    const still = applyConfigToState(config, tied);
    assert.equal(still.phase, 'regular');
    assert.deepEqual(still.games, [0, 0]);
  });

  it('does not touch a live tie-break or a finished match', () => {
    const config = setup({ setsFormat: 3, decidingSuperTiebreak: false });
    const tiebreak = toSixAll(config, createInitialState());
    const started = awardPoint(config, tiebreak, 0);
    const still = applyConfigToState({ ...config, decidingSuperTiebreak: true }, started);
    assert.equal(still.phase, 'tiebreak');
    assert.deepEqual(still.games, [6, 6]);
    assert.deepEqual(still.points, [1, 0]);

    const done = bagel(setup({ setsFormat: 1 }), createInitialState(), 1);
    assert.equal(done.status, 'finished');
    const renamed = applyConfigToState({ ...config, sport: 'tennis' }, done);
    assert.equal(renamed, done);
  });
});
