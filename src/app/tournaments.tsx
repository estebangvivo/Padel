import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { useTournaments } from '../context/TournamentContext';
import { useT } from '../i18n/I18nContext';
import { colors } from '../theme';

export default function TournamentsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { ready, tournaments } = useTournaments();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28 }]}
    >
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text style={styles.kicker}>{t('home.tournaments')}</Text>
          <Text style={styles.title}>{t('tour.title')}</Text>
        </View>
        <Pressable onPress={() => router.replace('/' as Href)} accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={8}>
          <Text style={styles.back}>{t('common.back')}</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        style={styles.create}
        onPress={() => router.push('/tournament/new' as Href)}
      >
        <Icon name="add" color={colors.ink} size={22} />
        <Text style={styles.createText}>{t('tour.new')}</Text>
      </Pressable>

      {!ready ? <Text style={styles.empty}>{t('home.loading')}</Text> : null}
      {ready && tournaments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('tour.empty')}</Text>
          <Text style={styles.empty}>{t('tour.emptyHint')}</Text>
        </View>
      ) : null}

      {tournaments.map((tournament) => (
        <Pressable
          key={tournament.id}
          accessibilityRole="button"
          style={styles.card}
          onPress={() => router.push(`/tournament/${tournament.id}` as Href)}
        >
          <View style={styles.cardCopy}>
            <Text style={styles.cardTitle}>{tournament.name}</Text>
            <Text style={styles.cardMeta}>
              {t('tour.pairCount', { n: tournament.pairs.length })} · {t('tour.court', { n: tournament.courts })} ·{' '}
              {t('tour.matches', { n: tournament.matches.filter((match) => match.status !== 'bye').length })}
            </Text>
          </View>
          <Icon name="chevron-forward" color={colors.muted} size={18} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  titleCopy: { flex: 1 },
  kicker: { color: colors.padel, fontSize: 12, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.8 },
  back: { color: colors.muted, fontSize: 16, fontWeight: '700', paddingTop: 8 },
  create: {
    marginTop: 8,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: colors.padel,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createText: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  emptyCard: {
    marginTop: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 8,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  empty: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  card: {
    minHeight: 76,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardCopy: { flex: 1, gap: 4 },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  cardMeta: { color: colors.muted, fontSize: 14 },
});
