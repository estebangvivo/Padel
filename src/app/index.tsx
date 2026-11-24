import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmModal } from '../components/ConfirmModal';
import { CourtWash } from '../components/CourtWash';
import { Icon } from '../components/Icon';
import { useAccount } from '../context/AccountContext';
import { useMatch } from '../context/MatchContext';
import { useT } from '../i18n/I18nContext';
import { usePresentCopy } from '../i18n/presentCopy';
import { categoryShortKey } from '../lib/category';
import { usePlayerTitles } from '../context/Titles';
import { teamLabel } from '../lib/present';
import { accentFor, colors } from '../theme';

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { t, openLanguage } = useT();
  const { account, openAccount } = useAccount();
  const profileTitles = usePlayerTitles(account?.id);
  const copy = usePresentCopy();
  const { ready, match, clearMatch } = useMatch();
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
      <View style={styles.screen}>
        <CourtWash accent={colors.padel} />
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28 }]}>
          <Text style={styles.kicker}>{t('home.kicker')}</Text>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel={t('home.brand')} />

          {account ? (
            <Pressable accessibilityRole="button" style={styles.profile} onPress={openAccount}>
              <View style={styles.profileCopy}>
                <Text style={styles.profileKicker}>{t('account.mine')}</Text>
                <Text style={styles.profileName}>{account.name}{profileTitles > 0 ? ` ★${profileTitles}` : ''} · {t(categoryShortKey(account.category))}</Text>
              </View>
              <Icon name="chevron-forward" color={colors.muted} size={18} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            style={styles.champCard}
            onPress={() => router.push('/new-match' as Href)}
          >
            <View style={styles.champCopy}>
              <Text style={styles.champKicker}>{t('home.title')}</Text>
              <Text style={styles.champTitle}>{t('home.title')}</Text>
              <Text style={styles.champHint}>{t('home.subtitle')}</Text>
            </View>
            <Icon name="chevron-forward" color={colors.ink} size={20} />
          </Pressable>
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
          <Pressable
            accessibilityRole="button"
            style={styles.linkCard}
            onPress={() => router.push('/watch-install' as Href)}
          >
            <View style={styles.watchCopy}>
              <Text style={styles.linkTitle}>{t('home.watchInstall')}</Text>
              <Text style={styles.watchHint}>{t('home.watchInstallHint')}</Text>
            </View>
            <Icon name="chevron-forward" color={colors.muted} size={18} />
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
        </ScrollView>
      </View>
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
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, gap: 8 },
  kicker: { color: colors.padel, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  logo: { width: '100%', aspectRatio: 493 / 357, marginTop: 4, marginBottom: 8 },
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
  watchCopy: { flex: 1, gap: 4 },
  watchHint: { color: colors.muted, fontSize: 13, lineHeight: 18 },
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
  profile: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileCopy: { flex: 1, gap: 2 },
  profileKicker: { color: colors.padel, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  profileName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  language: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  languageText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
});
