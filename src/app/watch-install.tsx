import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n/I18nContext';
import type { MessageKey } from '../i18n/messages';
import { colors } from '../theme';

const STEPS: MessageKey[] = [
  'watch.step1',
  'watch.step2',
  'watch.step3',
  'watch.step4',
  'watch.step5',
  'watch.step6',
  'watch.step7',
];

export default function WatchInstallScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useT();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28 }]}
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('watch.installTitle')}</Text>
        <Pressable onPress={() => router.replace('/' as Href)} accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={8}>
          <Text style={styles.back}>{t('common.back')}</Text>
        </Pressable>
      </View>
      <Text style={styles.intro}>{t('watch.installIntro')}</Text>
      {STEPS.map((key, index) => (
        <View key={key} style={styles.step}>
          <Text style={styles.number}>{index + 1}</Text>
          <Text style={styles.stepText}>{t(key)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  back: { color: colors.muted, fontSize: 16, fontWeight: '700', paddingTop: 8 },
  intro: { color: colors.muted, fontSize: 16, lineHeight: 22 },
  step: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 14,
  },
  number: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.padel,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 15,
    fontWeight: '800',
    overflow: 'hidden',
  },
  stepText: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 21 },
});
