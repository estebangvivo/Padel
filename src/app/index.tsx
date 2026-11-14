import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ConfirmModal } from '../components/ConfirmModal';
import { Icon } from '../components/Icon';
import { MatchSetupForm } from '../components/MatchSetupForm';
import { useMatch } from '../context/MatchContext';
import { useT } from '../i18n/I18nContext';
import { usePresentCopy } from '../i18n/presentCopy';
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
  decidingSuperTiebreak: false,
  initialServerTeam: 0,
  initialServerPlayer: 0,
  opponentFirstServer: 0,
};

export default function SetupScreen() {
  const { t, openLanguage } = useT();
  const copy = usePresentCopy();
  const { ready, match, startMatch, clearMatch } = useMatch();
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>{t('home.loading')}</Text>
      </View>
    );
  }

  const live = match?.state.status === 'live';

  return (
    <>
      <MatchSetupForm
        kicker={t('home.kicker')}
        title={t('home.title')}
        subtitle={t('home.subtitle')}
        submitLabel={t('home.start')}
        submitTestID="start-match"
        initial={NEW_MATCH}
        confirmSubmit={
          live
            ? {
                title: t('home.overwriteTitle'),
                message: t('home.overwriteMessage'),
              }
            : null
        }
        header={
          <>
            <Pressable
              accessibilityRole="button"
              style={styles.champCard}
              onPress={() => router.push('/tournaments' as Href)}
            >
              <View style={styles.champCopy}>
                <Text style={styles.champKicker}>{t('home.tournaments')}</Text>
                <Text style={styles.champTitle}>{t('tour.title')}</Text>
                <Text style={styles.champHint}>{t('home.tournamentsHint')}</Text>
              </View>
              <Icon name="chevron-forward" color={colors.ink} size={20} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={openLanguage} style={styles.language}>
              <Icon name="language" color={colors.muted} size={16} />
              <Text style={styles.languageText}>{t('home.language')}</Text>
            </Pressable>
            {live && match ? (
              <View style={[styles.resume, { borderColor: `${accentFor(match.config.sport)}55` }]}>
                <View style={styles.resumeCopy}>
                  <View style={styles.resumeTitleRow}>
                    <View style={[styles.liveDot, { backgroundColor: accentFor(match.config.sport) }]} />
                    <Text style={styles.resumeTitle}>{t('home.live')}</Text>
                  </View>
                  <Text style={styles.resumeText}>
                    {teamLabel(match.config, 0, copy)} {t('common.vs')} {teamLabel(match.config, 1, copy)}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('home.continue')}
                  style={[styles.resumeButton, { backgroundColor: accentFor(match.config.sport) }]}
                  onPress={() => router.replace('/match')}
                >
                  <Text style={styles.resumeButtonText}>{t('home.continue')}</Text>
                </Pressable>
                <Pressable onPress={() => setConfirmDiscard(true)} accessibilityRole="button">
                  <Text style={styles.discard}>{t('home.discard')}</Text>
                </Pressable>
              </View>
            ) : null}
            {match?.state.status === 'finished' ? (
              <Pressable style={styles.linkCard} onPress={() => router.replace('/summary')} accessibilityRole="button">
                <Text style={styles.linkTitle}>{t('home.lastResult')}</Text>
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
        title={t('home.discardTitle')}
        message={t('home.discardMessage')}
        confirmLabel={t('home.discard')}
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
  champCard: {
    marginTop: 8,
    borderRadius: 22,
    backgroundColor: colors.padel,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  champCopy: { flex: 1, gap: 4 },
  champKicker: { color: colors.ink, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, opacity: 0.7 },
  champTitle: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  champHint: { color: colors.ink, fontSize: 14, lineHeight: 19, opacity: 0.8 },
  language: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  languageText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
});
