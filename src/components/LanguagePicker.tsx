import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LOCALE_CHOICES, type Locale } from '../i18n/locales';
import { colors } from '../theme';
import { Icon } from './Icon';

interface LanguagePickerProps {
  visible: boolean;
  selected: Locale | null;
  canClose: boolean;
  onSelect: (locale: Locale) => void;
  onClose: () => void;
}

export function LanguagePicker({ visible, selected, canClose, onSelect, onClose }: LanguagePickerProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => (canClose ? onClose() : undefined)}>
      <View style={[styles.screen, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <View style={styles.copy}>
            <Text style={styles.kicker}>Idioma · Language</Text>
            <Text style={styles.title}>Idioma</Text>
            <Text style={styles.subtitle}>English · Português · Italiano · Français · العربية</Text>
          </View>
          {canClose ? (
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} style={styles.close}>
              <Icon name="close" color={colors.text} size={22} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.list}>
          {LOCALE_CHOICES.map((choice) => {
            const active = choice.id === selected;
            return (
              <Pressable
                key={choice.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => onSelect(choice.id)}
                style={[styles.choice, active && styles.choiceOn]}
              >
                <View>
                  <Text style={[styles.choiceLabel, active && styles.choiceLabelOn]}>{choice.label}</Text>
                  {choice.hint ? <Text style={[styles.choiceHint, active && styles.choiceLabelOn]}>{choice.hint}</Text> : null}
                </View>
                {active ? <Icon name="checkmark" color={colors.ink} size={22} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  copy: { flex: 1, gap: 6 },
  kicker: { color: colors.padel, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 36, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  list: { marginTop: 28, gap: 10 },
  choice: {
    minHeight: 68,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  choiceOn: { backgroundColor: colors.padel, borderColor: colors.padel },
  choiceLabel: { color: colors.text, fontSize: 20, fontWeight: '800' },
  choiceLabelOn: { color: colors.ink },
  choiceHint: { color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: 2 },
});
