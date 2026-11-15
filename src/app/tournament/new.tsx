import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateRangeCalendar } from '../../components/DateRangeCalendar';
import { CategoryPicker } from '../../components/CategoryPicker';
import { PlayerSlot } from '../../components/PlayerSlot';
import { usePlayers } from '../../context/PlayersContext';
import { useTournaments } from '../../context/TournamentContext';
import { formatLongDay, formatSlotWhen } from '../../i18n/format';
import { useT } from '../../i18n/I18nContext';
import {
  DEFAULT_WALKOVER,
  buildSlots,
  createFixture,
  createId,
  eachDate,
  type Tournament,
  type TournamentFormat,
} from '../../lib/tournament';
import { DEFAULT_CATEGORY, categoryConflict, categoryShortKey, type Category } from '../../lib/category';
import { type SetsFormat } from '../../lib/scoringEngine';
import { colors } from '../../theme';

interface DraftPair {
  id: string;
  playerA: string;
  playerB: string;
  phone: string;
  playerAId: string | null;
  playerBId: string | null;
  preferredSlotIds: string[];
}

const RANGE_LIMIT = 45;

function blankPair(): DraftPair {
  return { id: createId('pair'), playerA: '', playerB: '', phone: '', playerAId: null, playerBId: null, preferredSlotIds: [] };
}

export default function NewTournamentScreen() {
  const insets = useSafeAreaInsets();
  const { t, locale } = useT();
  const { rememberedDownloadUrl, rememberDownloadUrl, saveTournament } = useTournaments();
  const { players } = usePlayers();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY);
  const [courts, setCourts] = useState(2);
  const [minutes, setMinutes] = useState(90);
  const [format, setFormat] = useState<TournamentFormat>('roundRobin');
  const [setsFormat, setSetsFormat] = useState<SetsFormat>(3);
  const [walkover, setWalkover] = useState(DEFAULT_WALKOVER);
  const [downloadUrl, setDownloadUrl] = useState(rememberedDownloadUrl);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [dayStart, setDayStart] = useState('09:00');
  const [dayEnd, setDayEnd] = useState('21:00');
  const [pairs, setPairs] = useState<DraftPair[]>([blankPair(), blankPair()]);
  const [prefsOpen, setPrefsOpen] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rememberedDownloadUrl) return;
    setDownloadUrl((current) => current || rememberedDownloadUrl);
  }, [rememberedDownloadUrl]);

  const days = useMemo(() => {
    if (!rangeStart) return [];
    return eachDate(rangeStart, rangeEnd ?? rangeStart)
      .filter((date) => !skipped.includes(date))
      .map((date) => ({ date, start: dayStart, end: dayEnd }));
  }, [rangeStart, rangeEnd, skipped, dayStart, dayEnd]);
  const slots = useMemo(() => buildSlots(days, minutes), [days, minutes]);
  const conflict = useMemo(
    () => categoryConflict(pairs.flatMap((pair) => [pair.playerAId, pair.playerBId]), players, category),
    [pairs, players, category],
  );

  useEffect(() => {
    const ids = new Set(slots.map((slot) => slot.id));
    setPairs((current) => {
      let changed = false;
      const next = current.map((pair) => {
        const preferredSlotIds = pair.preferredSlotIds.filter((id) => ids.has(id));
        if (preferredSlotIds.length !== pair.preferredSlotIds.length) changed = true;
        return preferredSlotIds.length === pair.preferredSlotIds.length ? pair : { ...pair, preferredSlotIds };
      });
      return changed ? next : current;
    });
  }, [slots]);

  function pickDate(date: string) {
    if (!rangeStart || rangeEnd) {
      setRangeStart(date);
      setRangeEnd(null);
      setSkipped([]);
      setError(null);
      return;
    }
    const start = date < rangeStart ? date : rangeStart;
    const finish = date < rangeStart ? rangeStart : date;
    if (eachDate(start, finish).length > RANGE_LIMIT) {
      setError(t('tour.rangeTooLong'));
      return;
    }
    setRangeStart(start);
    setRangeEnd(finish);
    setSkipped([]);
    setError(null);
  }

  function togglePreference(pairId: string, slotId: string) {
    setPairs((current) =>
      current.map((pair) => {
        if (pair.id !== pairId) return pair;
        const preferredSlotIds = pair.preferredSlotIds.includes(slotId)
          ? pair.preferredSlotIds.filter((id) => id !== slotId)
          : [...pair.preferredSlotIds, slotId];
        return { ...pair, preferredSlotIds };
      }),
    );
  }

  function build() {
    const named = pairs
      .filter((pair) => pair.playerA.trim() || pair.playerB.trim())
      .map((pair) => ({
        ...pair,
        playerA: pair.playerA.trim(),
        playerB: pair.playerB.trim(),
        phone: pair.phone.trim(),
      }));
    if (named.length < 2) {
      setError(t('tour.needPairs'));
      return;
    }
    if (slots.length === 0) {
      setError(t('tour.needDay'));
      return;
    }
    if (conflict) {
      setError(
        t('tour.categoryBlocked', {
          name: conflict.name,
          category: t(categoryShortKey(conflict.category)),
          tournament: t(categoryShortKey(category)),
        }),
      );
      return;
    }
    const tournament: Tournament = {
      version: 1,
      id: createId('cup'),
      name: name.trim() || t('tour.namePlaceholder'),
      category,
      courts,
      matchMinutes: minutes,
      format,
      setsFormat,
      status: 'active',
      walkoverScore: walkover.trim() || DEFAULT_WALKOVER,
      downloadUrl: downloadUrl.trim(),
      days,
      slots,
      pairs: named,
      matches: [],
    };
    tournament.matches = createFixture(tournament.pairs, tournament.slots, tournament.courts, tournament.format);
    rememberDownloadUrl(tournament.downloadUrl);
    saveTournament(tournament);
    router.replace(`/tournament/${tournament.id}` as Href);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('tour.new')}</Text>
        <Pressable onPress={() => router.replace('/tournaments' as Href)} accessibilityRole="button">
          <Text style={styles.back}>{t('common.cancel')}</Text>
        </Pressable>
      </View>

      <Field label={t('tour.name')} value={name} placeholder={t('tour.namePlaceholder')} onChangeText={setName} />

      <Text style={styles.section}>{t('tour.category')}</Text>
      <Text style={styles.note}>{t('tour.categoryHint')}</Text>
      <CategoryPicker value={category} onChange={setCategory} />
      {conflict ? (
        <Text style={styles.error}>
          {t('tour.categoryBlocked', {
            name: conflict.name,
            category: t(categoryShortKey(conflict.category)),
            tournament: t(categoryShortKey(category)),
          })}
        </Text>
      ) : null}

      <Text style={styles.section}>{t('tour.courts')}</Text>
      <Stepper value={courts} min={1} max={16} onChange={setCourts} />

      <Text style={styles.section}>{t('tour.format')}</Text>
      <View style={styles.row}>
        {(['roundRobin', 'knockout'] as const).map((option) => {
          const selected = format === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              onPress={() => setFormat(option)}
              style={[styles.option, selected && styles.optionOn]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextOn]}>
                {option === 'roundRobin' ? t('tour.roundRobin') : t('tour.knockout')}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.note}>{format === 'roundRobin' ? t('tour.roundRobinHint') : t('tour.knockoutHint')}</Text>

      <Text style={styles.section}>{t('tour.sets')}</Text>
      <View style={styles.row}>
        {([1, 3, 5] as const).map((option) => {
          const selected = setsFormat === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              onPress={() => setSetsFormat(option)}
              style={[styles.option, selected && styles.optionOn]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextOn]}>
                {option === 1 ? t('form.set1') : t('form.setsN', { n: option })}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.note}>{t('tour.setsHint')}</Text>

      <Text style={styles.section}>{t('tour.duration')}</Text>
      <View style={styles.row}>
        {[60, 75, 90, 120].map((option) => {
          const selected = minutes === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              onPress={() => setMinutes(option)}
              style={[styles.option, selected && styles.optionOn]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextOn]}>{t('tour.minutes', { n: option })}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>{t('tour.walkover')}</Text>
      <Field label={t('tour.score')} value={walkover} placeholder={DEFAULT_WALKOVER} onChangeText={setWalkover} />
      <Text style={styles.note}>{t('tour.walkoverHint')}</Text>

      <Text style={styles.section}>{t('tour.download')}</Text>
      <Field label={t('tour.download')} value={downloadUrl} placeholder={t('tour.downloadPlaceholder')} onChangeText={setDownloadUrl} />

      <Text style={styles.section}>{t('tour.days')}</Text>
      <Text style={styles.note}>{t('tour.rangeHint')}</Text>
      <Text style={styles.note}>{t('tour.hardHint')}</Text>
      <DateRangeCalendar locale={locale} start={rangeStart} end={rangeEnd} onPick={pickDate} />
      <View style={styles.timeRow}>
        <View style={styles.summaryChip}>
          <Text style={styles.fieldLabel}>{t('tour.starts')}</Text>
          <Text style={styles.summaryValue}>{rangeStart ? formatLongDay(rangeStart, locale) : t('tour.pickStart')}</Text>
        </View>
        <View style={styles.summaryChip}>
          <Text style={styles.fieldLabel}>{t('tour.ends')}</Text>
          <Text style={styles.summaryValue}>
            {rangeEnd ? formatLongDay(rangeEnd, locale) : rangeStart ? formatLongDay(rangeStart, locale) : t('tour.pickStart')}
          </Text>
        </View>
      </View>
      <Text style={styles.section}>{t('tour.hours')}</Text>
      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <Field label={t('tour.from')} value={dayStart} placeholder="09:00" onChangeText={setDayStart} />
        </View>
        <View style={styles.timeField}>
          <Field label={t('tour.to')} value={dayEnd} placeholder="21:00" onChangeText={setDayEnd} />
        </View>
      </View>
      {days.map((day) => (
        <View key={day.date} style={styles.dayCard}>
          <Text style={styles.dayText}>
            {formatLongDay(day.date, locale)} · {day.start}–{day.end}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setSkipped((current) => [...current, day.date])}>
            <Text style={styles.remove}>{t('tour.remove')}</Text>
          </Pressable>
        </View>
      ))}

      <Text style={styles.section}>{t('tour.pairs')}</Text>
      <Text style={styles.note}>{t('player.hint')}</Text>
      <Text style={styles.note}>{t('tour.phoneHint')}</Text>
      {pairs.map((pair, index) => (
        <View key={pair.id} style={styles.pairCard}>
          <View style={styles.pairHead}>
            <Text style={styles.pairTitle}>{t('label.pairN', { n: index + 1 })}</Text>
            {pairs.length > 2 ? (
              <Pressable accessibilityRole="button" onPress={() => setPairs((current) => current.filter((item) => item.id !== pair.id))}>
                <Text style={styles.remove}>{t('tour.remove')}</Text>
              </Pressable>
            ) : null}
          </View>
          <PlayerSlot
            label={t('tour.playerA')}
            playerId={pair.playerAId}
            name={pair.playerA}
            excludeIds={pair.playerBId ? [pair.playerBId] : []}
            tournamentCategory={category}
            onPick={(player) => setPairs((current) => current.map((item) => (item.id === pair.id ? { ...item, playerA: player.name, playerAId: player.id } : item)))}
            onClear={() => setPairs((current) => current.map((item) => (item.id === pair.id ? { ...item, playerA: '', playerAId: null } : item)))}
          />
          <PlayerSlot
            label={t('tour.playerB')}
            playerId={pair.playerBId}
            name={pair.playerB}
            excludeIds={pair.playerAId ? [pair.playerAId] : []}
            tournamentCategory={category}
            onPick={(player) => setPairs((current) => current.map((item) => (item.id === pair.id ? { ...item, playerB: player.name, playerBId: player.id } : item)))}
            onClear={() => setPairs((current) => current.map((item) => (item.id === pair.id ? { ...item, playerB: '', playerBId: null } : item)))}
          />
          <Field
            label={t('tour.phone')}
            value={pair.phone}
            placeholder="54911…"
            onChangeText={(value) => setPairs((current) => current.map((item) => (item.id === pair.id ? { ...item, phone: value } : item)))}
          />
          {slots.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: Boolean(prefsOpen[pair.id]) }}
              style={[styles.secondary, prefsOpen[pair.id] && styles.optionOn]}
              onPress={() => setPrefsOpen((current) => ({ ...current, [pair.id]: !current[pair.id] }))}
            >
              <Text style={[styles.secondaryText, prefsOpen[pair.id] && styles.optionTextOn]}>
                {t('tour.preferences')}
                {pair.preferredSlotIds.length > 0 ? ` · ${pair.preferredSlotIds.length}` : ''}
              </Text>
            </Pressable>
          ) : null}
          {prefsOpen[pair.id] ? (
            <>
              <Text style={styles.note}>{t('tour.preferencesHint')}</Text>
              <View style={styles.chips}>
                {slots.map((slot) => {
                  const selected = pair.preferredSlotIds.includes(slot.id);
                  return (
                    <Pressable
                      key={slot.id}
                      accessibilityRole="button"
                      onPress={() => togglePreference(pair.id, slot.id)}
                      style={[styles.chip, selected && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{formatSlotWhen(slot, locale)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>
      ))}
      <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => setPairs((current) => [...current, blankPair()])}>
        <Text style={styles.secondaryText}>{t('tour.addPair')}</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" style={styles.primary} onPress={build}>
        <Text style={styles.primaryText}>{t('tour.build')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.dim}
        style={styles.input}
        autoCorrect={false}
        selectionColor={colors.padel}
      />
    </View>
  );
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable accessibilityRole="button" style={styles.step} onPress={() => onChange(Math.max(min, value - 1))}>
        <Text style={styles.stepText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable accessibilityRole="button" style={styles.step} onPress={() => onChange(Math.min(max, value + 1))}>
        <Text style={styles.stepText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, gap: 10 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  title: { flex: 1, color: colors.text, fontSize: 32, fontWeight: '800' },
  back: { color: colors.muted, fontSize: 16, fontWeight: '700', paddingTop: 8 },
  section: { color: colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 16 },
  note: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionOn: { backgroundColor: colors.padel, borderColor: colors.padel },
  optionText: { color: colors.muted, fontSize: 14, fontWeight: '800' },
  optionTextOn: { color: colors.ink },
  field: { gap: 6 },
  fieldLabel: { color: colors.dim, fontSize: 12, fontWeight: '700' },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '600',
  },
  timeRow: { flexDirection: 'row', gap: 10 },
  timeField: { flex: 1 },
  summaryChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  summaryValue: { color: colors.text, fontSize: 15, fontWeight: '800' },
  secondary: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  dayCard: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  remove: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  pairCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 8,
  },
  pairHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  pairTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.padel, borderColor: colors.padel },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  chipTextOn: { color: colors.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.text, fontSize: 24, fontWeight: '700' },
  stepValue: { color: colors.text, fontSize: 28, fontWeight: '800', minWidth: 36, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  primary: { minHeight: 56, borderRadius: 18, backgroundColor: colors.padel, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryText: { color: colors.ink, fontSize: 17, fontWeight: '800' },
});
