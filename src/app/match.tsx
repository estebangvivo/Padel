import { LinearGradient } from 'expo-linear-gradient';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmModal } from '../components/ConfirmModal';
import { CourtWash } from '../components/CourtWash';
import { Icon } from '../components/Icon';
import { useMatch } from '../context/MatchContext';
import { useElapsedClock } from '../hooks/useElapsedClock';
import { hapticPoint, hapticSuccess, hapticUndo } from '../lib/haptics';
import {
  alertCopy,
  alertHeadline,
  heroAlert,
  modeLabel,
  playerLabel,
  scoreChips,
  secondaryAlerts,
  teamLabel,
} from '../lib/present';
import { getAlerts, getCurrentServer, pointLabel, setsWon, type TeamIndex } from '../lib/scoringEngine';
import { formatClock } from '../lib/timer';
import { accentFor, alertColors, colors } from '../theme';

export default function MatchScreen() {
  useKeepAwake('match-scoreboard', { suppressDeactivateWarnings: true });
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const { ready, match, addPoint, undo, resetMatch, toggleTimer, canUndo } = useMatch();
  const elapsed = useElapsedClock(match?.timer ?? null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!match) router.replace('/');
    else if (match.state.status === 'finished') router.replace('/summary');
  }, [ready, match]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setConfirmLeave(true);
      return true;
    });
    return () => subscription.remove();
  }, []);

  if (!ready || !match || match.state.status !== 'live') {
    return <View style={styles.screen} />;
  }

  const { config, state } = match;
  const accent = accentFor(config.sport);
  const alerts = getAlerts(config, state);
  const hero = heroAlert(alerts);
  const heroTone = hero && hero.type !== 'tiebreak' && hero.type !== 'superTiebreak' ? alertColors(hero.type) : null;
  const mode = modeLabel(alerts);
  const extras = secondaryAlerts(alerts, hero);
  const server = getCurrentServer(config, state);
  const won = setsWon(state);
  const chips = scoreChips(state);
  const scoreFont = landscape ? 72 : Math.round(Math.min(112, Math.max(76, width * 0.23)));
  const serverName = playerLabel(config, server.team, server.playerIndex);

  function score(team: TeamIndex) {
    const result = addPoint(team);
    if (result === 'match') hapticSuccess();
    else if (result === 'point') hapticPoint();
  }

  function onUndo() {
    if (!canUndo) return;
    hapticUndo();
    undo();
  }

  return (
    <View style={styles.screen}>
      <CourtWash accent={accent} />
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.controls}>
          <Pressable
            testID="undo"
            style={[styles.control, !canUndo && styles.controlDisabled]}
            onPress={onUndo}
            disabled={!canUndo}
            accessibilityRole="button"
            accessibilityLabel="Deshacer el último punto"
          >
            <Icon name="arrow-undo" color={canUndo ? colors.text : colors.dim} size={16} />
            <Text style={[styles.controlText, !canUndo && styles.controlTextDisabled]}>Deshacer</Text>
          </Pressable>

          <Pressable
            testID="timer"
            style={[styles.clock, match.timer.running && { borderColor: `${accent}88` }]}
            onPress={toggleTimer}
            accessibilityRole="button"
            accessibilityLabel={match.timer.running ? 'Pausar cronómetro' : 'Reanudar cronómetro'}
          >
            <View style={[styles.clockDot, { backgroundColor: match.timer.running ? accent : colors.warning }]} />
            <Text style={[styles.clockText, !match.timer.running && styles.clockPaused]}>{formatClock(elapsed)}</Text>
            <Icon name={match.timer.running ? 'pause' : 'play'} color={match.timer.running ? colors.text : colors.warning} size={14} />
          </Pressable>

          <Pressable
            testID="reset-match"
            style={styles.control}
            onPress={() => setConfirmReset(true)}
            accessibilityRole="button"
            accessibilityLabel="Reiniciar partido"
          >
            <Icon name="refresh" color={colors.muted} size={16} />
            <Text style={styles.controlMuted}>Reiniciar</Text>
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.servePill}>
            <View style={styles.serveBall} />
            <Text style={styles.serveLine} numberOfLines={1}>
              Saca <Text style={{ color: accent }}>{serverName}</Text>
            </Text>
          </View>
          <View style={styles.metaActions}>
            <Pressable
              testID="edit-match"
              onPress={() => router.push('/edit')}
              hitSlop={8}
              style={styles.metaButton}
              accessibilityRole="button"
              accessibilityLabel="Editar datos del partido"
            >
              <Icon name="create-outline" color={colors.text} size={14} />
              <Text style={styles.edit}>Editar</Text>
            </Pressable>
            <Pressable
              onPress={() => setConfirmLeave(true)}
              hitSlop={8}
              style={styles.metaButton}
              accessibilityRole="button"
              accessibilityLabel="Salir del marcador"
            >
              <Text style={styles.exit}>Salir</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.board}>
          {chips.map((chip) => (
            <View key={chip.key} style={[styles.chip, chip.live && { borderColor: accent, backgroundColor: `${accent}18` }]}>
              <Text style={styles.chipLabel}>{chip.label}</Text>
              <Text style={[styles.chipText, chip.live && { color: colors.text }]}>{chip.text}</Text>
            </View>
          ))}
        </ScrollView>

        {mode ? (
          <View style={[styles.mode, state.phase === 'superTiebreak' && { borderColor: accent }]}>
            <Text style={[styles.modeText, { color: state.phase === 'superTiebreak' ? accent : colors.tiebreak }]}>{mode}</Text>
          </View>
        ) : null}

        {hero && heroTone ? (
          <View style={[styles.hero, { backgroundColor: heroTone.background }]}>
            <Text style={[styles.heroText, { color: heroTone.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {alertHeadline(config, hero)}
            </Text>
          </View>
        ) : null}

        {extras.length > 0 ? (
          <View style={styles.extras}>
            {extras.map((alert) => (
              <View key={`${alert.type}-${alert.team ?? 'x'}`} style={styles.extra}>
                <Text style={styles.extraText}>{alertCopy(alert.type)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {state.changeOfEnds ? (
          <View style={[styles.change, { backgroundColor: accent }]}>
            <Icon name="swap-horizontal" color={colors.ink} size={18} />
            <Text style={styles.changeText}>CAMBIO DE LADO</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.court}>
        {([0, 1] as const).map((team) => {
          const serving = server.team === team;
          const players = config.format === 'singles' ? ([0] as const) : ([0, 1] as const);
          const card = (serving ? [`${accent}40`, colors.surface] : [colors.surfaceRaised, colors.surface]) as [
            ColorValue,
            ColorValue,
          ];
          return (
            <Pressable
              key={team}
              testID={`score-team-${team}`}
              onPress={() => score(team)}
              accessibilityRole="button"
              accessibilityLabel={`Sumar punto a ${teamLabel(config, team)}`}
              android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
              style={({ pressed }) => [
                styles.half,
                serving && { borderColor: `${accent}66` },
                { paddingBottom: Math.max(insets.bottom, 14), opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <LinearGradient colors={card} style={StyleSheet.absoluteFill} pointerEvents="none" />
              {serving ? <View style={[styles.serveBar, { backgroundColor: accent }]} /> : null}
              <View style={styles.identity}>
                <View style={styles.names}>
                  {players.map((player) => {
                    const isServer = serving && server.playerIndex === player;
                    return (
                      <View key={player} style={styles.playerRow}>
                        <View style={styles.ballSlot}>
                          {isServer ? <View style={styles.ballGlow} /> : null}
                          <View style={[styles.ball, isServer ? styles.ballOn : styles.ballOff]} />
                        </View>
                        <Text
                          style={[styles.player, isServer && { color: accent }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {playerLabel(config, team, player)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <View style={[styles.setPill, serving && { borderColor: `${accent}88` }]}>
                  <Text style={[styles.setValue, serving && { color: accent }]}>{won[team]}</Text>
                  <Text style={styles.setLabel}>SETS</Text>
                </View>
              </View>

              <Text style={[styles.score, { fontSize: scoreFont }]} allowFontScaling={false} numberOfLines={1}>
                {pointLabel(config, state, team)}
              </Text>

              <View style={styles.cardFoot}>
                <Text style={styles.gamesCaption}>{state.phase === 'superTiebreak' ? 'PUNTOS' : 'GAMES'}</Text>
                {state.phase === 'superTiebreak' ? null : <Text style={styles.games}>{state.games[team]}</Text>}
                <View style={[styles.plusPill, { borderColor: `${accent}55`, backgroundColor: `${accent}16` }]}>
                  <Text style={[styles.plus, { color: accent }]}>+1</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <ConfirmModal
        visible={confirmReset}
        title="¿Reiniciar el partido?"
        message="El marcador vuelve a cero. Se mantienen los jugadores, el formato y las reglas."
        confirmLabel="Reiniciar"
        destructive
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          resetMatch();
        }}
      />
      <ConfirmModal
        visible={confirmLeave}
        title="¿Salir del marcador?"
        message="El partido queda guardado en este teléfono. Podés continuarlo cuando vuelvas."
        confirmLabel="Salir"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          router.replace('/');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: 14, gap: 10 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  control: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(17,24,32,0.9)',
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  controlDisabled: { opacity: 0.4 },
  controlText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  controlTextDisabled: { color: colors.dim },
  controlMuted: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  clock: {
    minWidth: 118,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  clockDot: { width: 7, height: 7, borderRadius: 4 },
  clockText: { color: colors.text, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: 0.4 },
  clockPaused: { color: colors.warning },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  servePill: {
    flex: 1,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,32,0.85)',
    borderWidth: 1,
    borderColor: colors.line,
  },
  serveBall: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ball },
  serveLine: { flex: 1, color: colors.muted, fontSize: 13, fontWeight: '700' },
  metaActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaButton: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(17,24,32,0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  edit: { color: colors.text, fontSize: 13, fontWeight: '800' },
  exit: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  board: { gap: 8, paddingVertical: 2 },
  chip: {
    minWidth: 84,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(17,24,32,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipLabel: { color: colors.dim, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  chipText: { color: colors.muted, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  mode: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.tiebreak,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(122,231,255,0.08)',
  },
  modeText: { fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
  hero: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  heroText: { fontSize: 16, fontWeight: '900', letterSpacing: 0.6 },
  extras: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  extra: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  extraText: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
  change: {
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  changeText: { color: colors.ink, fontSize: 15, fontWeight: '900', letterSpacing: 1.6 },
  court: { flex: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10 },
  half: {
    flex: 1,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingTop: 16,
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
  },
  serveBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  identity: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  names: { flex: 1, gap: 6 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ballSlot: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  ballGlow: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.ball,
    opacity: 0.35,
  },
  ball: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5 },
  ballOn: { backgroundColor: colors.ball, borderColor: colors.ball },
  ballOff: { backgroundColor: 'transparent', borderColor: colors.line },
  player: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '800' },
  setPill: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(7,9,12,0.35)',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  setValue: { color: colors.text, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  setLabel: { color: colors.dim, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  score: {
    color: colors.text,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    letterSpacing: -3,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 8 },
    textShadowRadius: 18,
  },
  cardFoot: { alignItems: 'center', gap: 2, paddingBottom: 4 },
  gamesCaption: { color: colors.dim, textAlign: 'center', fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  games: {
    color: colors.text,
    textAlign: 'center',
    fontSize: 30,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    lineHeight: 34,
  },
  plusPill: {
    marginTop: 6,
    minWidth: 64,
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  plus: { textAlign: 'center', fontSize: 16, fontWeight: '900', letterSpacing: 0.4 },
});
