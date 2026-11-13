import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CourtWash } from '../components/CourtWash';
import { Icon } from '../components/Icon';
import { useMatch } from '../context/MatchContext';
import { useElapsedClock } from '../hooks/useElapsedClock';
import { hapticUndo } from '../lib/haptics';
import { buildShareMessage, formatSetScore, teamLabel } from '../lib/present';
import { copyResult, shareResult } from '../lib/shareResult';
import type { TeamIndex } from '../lib/scoringEngine';
import { formatClock } from '../lib/timer';
import { accentFor, colors } from '../theme';

export default function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const { ready, match, clearMatch, undo, canUndo } = useMatch();
  const elapsed = useElapsedClock(match?.timer ?? null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!match) router.replace('/');
    else if (match.state.status !== 'finished') router.replace('/match');
  }, [ready, match]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/');
      return true;
    });
    return () => subscription.remove();
  }, []);

  if (!ready || !match || match.state.status !== 'finished') {
    return <View style={styles.screen} />;
  }

  const winner = match.state.winner;
  if (winner == null) {
    return <View style={styles.screen} />;
  }

  const { config, state } = match;
  const accent = accentFor(config.sport);
  const message = buildShareMessage(config, state, elapsed);
  const sport = config.sport === 'padel' ? 'Pádel' : 'Tenis';
  const format = config.format === 'doubles' ? 'Dobles' : 'Singles';

  async function onShare() {
    const result = await shareResult(message);
    if (result === 'copied-only') setNotice('No se abrió el menú. El resultado quedó copiado.');
    else if (result === 'shared') setNotice('Listo para enviar.');
    else setNotice(null);
  }

  async function onCopy() {
    const ok = await copyResult(message);
    setNotice(ok ? 'Copiado. Pegalo en WhatsApp.' : 'No se pudo copiar el resultado.');
  }

  const glow = [`${accent}44`, 'rgba(17,24,32,0)'] as [ColorValue, ColorValue];

  return (
    <View style={styles.screen}>
    <CourtWash accent={accent} />
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }]}
    >
      <View style={[styles.heroCard, { borderColor: `${accent}55` }]}>
        <LinearGradient colors={glow} style={styles.heroGlow} pointerEvents="none" />
        <Text style={styles.kicker}>
          {sport} · {format}
        </Text>
        <Text style={[styles.eyebrow, { color: accent }]}>GANADOR</Text>
        <Text style={styles.winner} adjustsFontSizeToFit numberOfLines={3}>
          {teamLabel(config, winner)}
        </Text>
        <View style={styles.scoreRow}>
          {state.sets.map((set, index) => (
            <View key={`${formatSetScore(set)}-${index}`} style={styles.scorePill}>
              <Text style={styles.scorePillLabel}>{set.superTiebreak ? 'Súper' : `Set ${index + 1}`}</Text>
              <Text style={[styles.scorePillValue, { color: accent }]}>{formatSetScore(set)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.durationPill}>
          <Icon name="time-outline" color={colors.muted} size={16} />
          <Text style={styles.duration}>{formatClock(elapsed)}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHead}>
          <Text style={styles.headLabel}>Set</Text>
          <NameHeader team={0} winner={winner} label={teamLabel(config, 0)} accent={accent} />
          <NameHeader team={1} winner={winner} label={teamLabel(config, 1)} accent={accent} />
        </View>
        {state.sets.map((set, index) => (
          <View key={`${set.games.join('-')}-${index}`} style={styles.tableRow}>
            <Text style={styles.setName}>{set.superTiebreak ? 'Súper' : `Set ${index + 1}`}</Text>
            <Text style={[styles.cell, set.games[0] > set.games[1] && { color: accent }]}>{set.games[0]}</Text>
            <Text style={[styles.cell, set.games[1] > set.games[0] && { color: accent }]}>{set.games[1]}</Text>
          </View>
        ))}
        {state.sets.some((set) => set.tiebreak) ? (
          <Text style={styles.tiebreakNote}>
            {state.sets
              .map((set, index) => (set.tiebreak ? `Set ${index + 1}: tie-break ${set.tiebreak[0]}-${set.tiebreak[1]}` : null))
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}
      </View>

      <Pressable
        testID="share-result"
        accessibilityRole="button"
        accessibilityLabel="Compartir resultado"
        style={[styles.primary, { backgroundColor: accent }]}
        onPress={() => void onShare()}
      >
        <Icon name="share-social" color={colors.ink} size={18} />
        <Text style={styles.primaryText}>Compartir resultado</Text>
      </Pressable>
      <Pressable
        testID="copy-result"
        accessibilityRole="button"
        accessibilityLabel="Copiar resultado"
        style={styles.secondary}
        onPress={() => void onCopy()}
      >
        <Icon name="copy-outline" color={colors.text} size={18} />
        <Text style={styles.secondaryText}>Copiar</Text>
      </Pressable>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <Text style={styles.preview}>{message}</Text>

      <Pressable
        testID="edit-result"
        accessibilityRole="button"
        accessibilityLabel="Editar datos del partido"
        style={styles.secondary}
        onPress={() => router.push('/edit')}
      >
        <Icon name="create-outline" color={colors.text} size={18} />
        <Text style={styles.secondaryText}>Editar datos</Text>
      </Pressable>

      <Pressable
        testID="new-match"
        accessibilityRole="button"
        accessibilityLabel="Nuevo partido"
        style={styles.secondary}
        onPress={() => {
          clearMatch();
          router.replace('/');
        }}
      >
        <Text style={styles.secondaryText}>Nuevo partido</Text>
      </Pressable>
      {canUndo ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Deshacer último punto"
          style={styles.ghost}
          onPress={() => {
            hapticUndo();
            undo();
            router.replace('/match');
          }}
        >
          <Text style={styles.ghostText}>Deshacer último punto</Text>
        </Pressable>
      ) : null}
    </ScrollView>
    </View>
  );
}

function NameHeader({
  team,
  winner,
  label,
  accent,
}: {
  team: TeamIndex;
  winner: TeamIndex;
  label: string;
  accent: string;
}) {
  return (
    <Text style={[styles.headName, team === winner && { color: accent }]} numberOfLines={2}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, gap: 12 },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: colors.surface,
    padding: 22,
    gap: 6,
    overflow: 'hidden',
  },
  heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },
  kicker: { color: colors.dim, fontSize: 12, fontWeight: '800', letterSpacing: 1.8 },
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 2.2, marginTop: 10 },
  winner: { color: colors.text, fontSize: 40, fontWeight: '800', letterSpacing: -1, lineHeight: 44 },
  scoreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  scorePill: {
    minWidth: 84,
    borderRadius: 16,
    backgroundColor: 'rgba(7,9,12,0.45)',
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scorePillLabel: { color: colors.dim, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  scorePillValue: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  durationPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(7,9,12,0.35)',
  },
  duration: { color: colors.muted, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  table: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 8,
  },
  tableHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  headLabel: { flex: 0.8, color: colors.dim, fontSize: 12, fontWeight: '800' },
  headName: { flex: 1, color: colors.muted, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setName: { flex: 0.8, color: colors.muted, fontSize: 15, fontWeight: '700' },
  cell: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  tiebreakNote: { color: colors.dim, fontSize: 13, lineHeight: 18 },
  primary: {
    marginTop: 8,
    minHeight: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  secondary: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  notice: { color: colors.padel, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  preview: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  ghost: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: colors.muted, fontSize: 15, fontWeight: '700' },
});
