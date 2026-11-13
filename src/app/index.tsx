import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ConfirmModal } from '../components/ConfirmModal';
import { Icon } from '../components/Icon';
import { MatchSetupForm } from '../components/MatchSetupForm';
import { useMatch } from '../context/MatchContext';
import { teamLabel } from '../lib/present';
import type { SetupInput } from '../lib/scoringEngine';
import { accentFor, colors } from '../theme';

const NEW_MATCH: SetupInput = {
  sport: 'padel',
  format: 'doubles',
  names: [
    ['', ''],
    ['', ''],
  ],
  setsFormat: 3,
  deuceRule: 'advantage',
  decidingSuperTiebreak: true,
  initialServerTeam: 0,
  initialServerPlayer: 0,
  opponentFirstServer: 0,
};

export default function SetupScreen() {
  const { ready, match, startMatch, clearMatch } = useMatch();
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Cargando partido…</Text>
      </View>
    );
  }

  const live = match?.state.status === 'live';

  return (
    <>
      <MatchSetupForm
        kicker="PÁDEL · TENIS"
        title="Nuevo partido"
        subtitle="Configurá el marcador antes de salir a la cancha."
        submitLabel="Empezar partido"
        submitTestID="start-match"
        initial={NEW_MATCH}
        confirmSubmit={
          live
            ? {
                title: '¿Empezar de cero?',
                message: 'Hay un partido guardado. Si empezás uno nuevo, ese marcador se reemplaza.',
              }
            : null
        }
        header={
          <>
            {live && match ? (
              <View style={[styles.resume, { borderColor: `${accentFor(match.config.sport)}55` }]}>
                <View style={styles.resumeCopy}>
                  <View style={styles.resumeTitleRow}>
                    <View style={[styles.liveDot, { backgroundColor: accentFor(match.config.sport) }]} />
                    <Text style={styles.resumeTitle}>Partido en curso</Text>
                  </View>
                  <Text style={styles.resumeText}>
                    {teamLabel(match.config, 0)} vs {teamLabel(match.config, 1)}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continuar partido"
                  style={[styles.resumeButton, { backgroundColor: accentFor(match.config.sport) }]}
                  onPress={() => router.replace('/match')}
                >
                  <Text style={styles.resumeButtonText}>Continuar</Text>
                </Pressable>
                <Pressable onPress={() => setConfirmDiscard(true)} accessibilityRole="button">
                  <Text style={styles.discard}>Descartar</Text>
                </Pressable>
              </View>
            ) : null}
            {match?.state.status === 'finished' ? (
              <Pressable style={styles.linkCard} onPress={() => router.replace('/summary')} accessibilityRole="button">
                <Text style={styles.linkTitle}>Ver último resultado</Text>
                <Icon name="chevron-forward" color={colors.muted} size={18} />
              </Pressable>
            ) : null}
          </>
        }
        onSubmit={(config) => {
          startMatch(config);
          router.replace('/match');
        }}
      />
      <ConfirmModal
        visible={confirmDiscard}
        title="¿Descartar el partido?"
        message="Se borra el marcador guardado en este teléfono."
        confirmLabel="Descartar"
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          clearMatch();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.muted, fontSize: 16 },
  resume: {
    marginTop: 12,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 12,
  },
  resumeCopy: { gap: 6 },
  resumeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  resumeTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  resumeText: { color: colors.muted, fontSize: 15 },
  resumeButton: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  resumeButtonText: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  discard: { color: colors.danger, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  linkCard: {
    marginTop: 8,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
