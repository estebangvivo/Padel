import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { localeTag } from '../i18n/format';
import type { Locale } from '../i18n/locales';
import { isHardDay, toISODate } from '../lib/tournament';
import { colors } from '../theme';
import { Icon } from './Icon';

interface DateRangeCalendarProps {
  locale: Locale;
  start: string | null;
  end: string | null;
  onPick: (date: string) => void;
}

function weekStartsOn(locale: Locale): number {
  if (locale === 'en') return 0;
  if (locale === 'ar') return 6;
  return 1;
}

export function DateRangeCalendar({ locale, start, end, onPick }: DateRangeCalendarProps) {
  const today = toISODate(new Date());
  const opened = (start ?? today).split('-').map(Number);
  const [cursor, setCursor] = useState({ year: opened[0] || 2026, month: (opened[1] || 1) - 1 });
  const weekStart = weekStartsOn(locale);
  const tag = localeTag[locale];
  const labels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        new Date(2026, 10, 1 + weekStart + index).toLocaleDateString(tag, { weekday: 'narrow' }),
      ),
    [tag, weekStart],
  );
  const title = new Date(cursor.year, cursor.month, 1).toLocaleDateString(tag, { month: 'long', year: 'numeric' });
  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const lead = (first.getDay() - weekStart + 7) % 7;
    const count = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const result: Array<string | null> = Array.from({ length: lead }, () => null);
    for (let day = 1; day <= count; day += 1) result.push(toISODate(new Date(cursor.year, cursor.month, day)));
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [cursor, weekStart]);
  const last = end ?? start;

  function shift(delta: number) {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => shift(-1)} style={styles.nav}>
          <Icon name="chevron-back" color={colors.text} size={20} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Pressable accessibilityRole="button" onPress={() => shift(1)} style={styles.nav}>
          <Icon name="chevron-forward" color={colors.text} size={20} />
        </Pressable>
      </View>
      <View style={styles.week}>
        {labels.map((label, index) => (
          <Text key={`${label}-${index}`} style={styles.weekLabel}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((iso, index) => {
          if (!iso) return <View key={`empty-${index}`} style={styles.cell} />;
          const edge = iso === start || iso === end;
          const inside = Boolean(start && last && iso >= start && iso <= last);
          return (
            <Pressable
              key={iso}
              accessibilityRole="button"
              accessibilityLabel={iso}
              onPress={() => onPick(iso)}
              style={[styles.cell, inside && styles.inside, edge && styles.edge]}
            >
              <Text style={[styles.day, edge && styles.dayOn, iso === today && !edge && styles.today]}>{Number(iso.slice(-2))}</Text>
              {isHardDay(iso) ? <View style={[styles.dot, edge && styles.dotOn]} /> : <View style={styles.dotSpacer} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },
  week: { flexDirection: 'row' },
  weekLabel: { flex: 1, textAlign: 'center', color: colors.dim, fontSize: 12, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  inside: { backgroundColor: 'rgba(210,243,74,0.18)', borderRadius: 0 },
  edge: { backgroundColor: colors.padel, borderRadius: 12 },
  day: { color: colors.text, fontSize: 15, fontWeight: '700' },
  dayOn: { color: colors.ink },
  today: { color: colors.padel },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.warning, marginTop: 2 },
  dotOn: { backgroundColor: colors.ink },
  dotSpacer: { width: 5, height: 5, marginTop: 2 },
});
