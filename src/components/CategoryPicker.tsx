import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '../i18n/I18nContext';
import { CATEGORIES, categoryDetailKey, categoryLevelKey, categoryShortKey, type Category } from '../lib/category';
import { colors } from '../theme';

interface CategoryPickerProps {
  value: Category;
  floor?: Category;
  compact?: boolean;
  onChange: (value: Category) => void;
}

export function CategoryPicker({ value, floor = 8, compact = false, onChange }: CategoryPickerProps) {
  const { t } = useT();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {CATEGORIES.map((category) => {
          const selected = category === value;
          const locked = category > floor;
          return (
            <Pressable
              key={category}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: locked }}
              disabled={locked}
              onPress={() => {
                if (!locked) onChange(category);
              }}
              style={[styles.chip, selected && styles.chipOn, locked && styles.chipLocked]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextOn, locked && styles.chipTextLocked]}>{t(categoryShortKey(category))}</Text>
            </Pressable>
          );
        })}
      </View>
      {compact ? null : <Text style={styles.level}>{t(categoryLevelKey(value))}</Text>}
      {compact ? null : <Text style={styles.detail}>{t(categoryDetailKey(value))}</Text>}
      {!compact && floor < 8 ? <Text style={styles.detail}>{t('player.lockedHint')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minWidth: 64,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.padel, borderColor: colors.padel },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  chipTextOn: { color: colors.ink },
  chipLocked: { opacity: 0.35 },
  chipTextLocked: { color: colors.dim },
  level: { color: colors.padel, fontSize: 14, fontWeight: '800' },
  detail: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
