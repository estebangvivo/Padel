import { useMemo, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CourtWash } from './CourtWash';
import { PlayerSlot } from './PlayerSlot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n/I18nContext';
import { usePresentCopy } from '../i18n/presentCopy';
import { useTitleLookup } from '../context/Titles';
import { playerLabel, teamLabel } from '../lib/present';
import {
  createMatchConfig,
  type DeuceRule,
  type MatchConfig,
  type MatchFormat,
  type PlayerIndex,
  type SetsFormat,
  type SetupInput,
  type Sport,
  type TeamIndex,
} from '../lib/scoringEngine';
import { accentFor, colors } from '../theme';
import { ConfirmModal } from './ConfirmModal';
import { Icon } from './Icon';
import { SegmentedControl } from './SegmentedControl';

interface ConfirmCopy {
  title: string;
  message: string;
}

interface MatchSetupFormProps {
  kicker: string;
  title: string;
  subtitle: string;
  submitLabel: string;
  submitTestID?: string;
  initial: SetupInput;
  header?: ReactNode;
  confirmSubmit?: ConfirmCopy | null;
  onSubmit: (config: MatchConfig) => void;
  onCancel?: () => void;
}

export function MatchSetupForm({
  kicker,
  title,
  subtitle,
  submitLabel,
  submitTestID,
  initial,
  header,
  confirmSubmit,
  onSubmit,
  onCancel,
}: MatchSetupFormProps) {
  const { t } = useT();
  const copy = usePresentCopy();
  const insets = useSafeAreaInsets();
  const [sport, setSport] = useState<Sport>(initial.sport);
  const [format, setFormat] = useState<MatchFormat>(initial.format);
  const [setsFormat, setSetsFormat] = useState<SetsFormat>(initial.setsFormat);
  const [deuceRule, setDeuceRule] = useState<DeuceRule>(initial.deuceRule);
  const [superTiebreak, setSuperTiebreak] = useState(initial.decidingSuperTiebreak);
  const [slots, setSlots] = useState<[PlayerSlotState, PlayerSlotState, PlayerSlotState, PlayerSlotState]>([
    { id: initial.playerIds?.[0][0] ?? null, name: initial.names[0][0] },
    { id: initial.playerIds?.[0][1] ?? null, name: initial.names[0][1] },
    { id: initial.playerIds?.[1][0] ?? null, name: initial.names[1][0] },
    { id: initial.playerIds?.[1][1] ?? null, name: initial.names[1][1] },
  ]);
  const [initialTeam, setInitialTeam] = useState<TeamIndex>(initial.initialServerTeam);
  const [initialPlayer, setInitialPlayer] = useState<PlayerIndex>(initial.initialServerPlayer);
  const [opponentPlayer, setOpponentPlayer] = useState<PlayerIndex>(initial.opponentFirstServer);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const titlesFor = useTitleLookup();

  const accent = accentFor(sport);
  const draft = useMemo(
    () =>
      createMatchConfig({
        sport,
        format,
        names: [
          [slots[0].name, slots[1].name],
          [slots[2].name, slots[3].name],
        ],
        playerIds: [
          [slots[0].id, slots[1].id],
          [slots[2].id, slots[3].id],
        ],
        setsFormat,
        deuceRule,
        decidingSuperTiebreak: superTiebreak,
        initialServerTeam: initialTeam,
        initialServerPlayer: format === 'singles' ? 0 : initialPlayer,
        opponentFirstServer: opponentPlayer,
      }),
    [sport, format, slots, setsFormat, deuceRule, superTiebreak, initialTeam, initialPlayer, opponentPlayer],
  );

  function shownPlayer(team: TeamIndex, player: PlayerIndex) {
    const index = (team === 0 ? 0 : 2) + player;
    const raw = playerLabel(draft, team, player, copy);
    const count = titlesFor(slots[index]?.id);
    if (!slots[index]?.name.trim() || count <= 0) return raw;
    return `${slots[index].name.trim()} ★${count}`;
  }

  const serverName = shownPlayer(initialTeam, format === 'singles' ? 0 : initialPlayer);
  const summary = [
    sport === 'padel' ? t('sport.padel') : t('sport.tennis'),
    format === 'doubles' ? t('sport.doubles') : t('sport.singles'),
    setsFormat === 1 ? t('form.set1') : t('form.setsN', { n: setsFormat }),
    deuceRule === 'golden' ? t('form.golden') : t('form.advantage'),
    superTiebreak ? t('form.tiebreak11') : t('form.tiebreak7'),
    t('form.serves', { name: serverName }),
  ].join(' · ');

  const otherTeam = (1 - initialTeam) as TeamIndex;
  const firstServers =
    format === 'singles'
      ? ([
          { team: 0 as TeamIndex, player: 0 as PlayerIndex },
          { team: 1 as TeamIndex, player: 0 as PlayerIndex },
        ] as const)
      : ([
          { team: 0 as TeamIndex, player: 0 as PlayerIndex },
          { team: 0 as TeamIndex, player: 1 as PlayerIndex },
          { team: 1 as TeamIndex, player: 0 as PlayerIndex },
          { team: 1 as TeamIndex, player: 1 as PlayerIndex },
        ] as const);

  function pickPlayer(index: number, player: { id: string; name: string }) {
    setSlots((current) => current.map((slot, item) => (item === index ? { id: player.id, name: player.name } : slot)) as typeof current);
  }

  function clearPlayer(index: number) {
    setSlots((current) => current.map((slot, item) => (item === index ? { id: null, name: '' } : slot)) as typeof current);
  }

  function submit() {
    onSubmit(draft);
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <CourtWash accent={accent} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={[styles.kicker, { color: accent }]}>{kicker}</Text>
            <Text style={styles.title}>{title}</Text>
            <View style={[styles.titleRule, { backgroundColor: accent }]} />
          </View>
          {onCancel ? (
            <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('form.cancelA11y')}>
              <Text style={styles.cancel}>{t('common.cancel')}</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {header}

        <SectionLabel accent={accent}>{t('form.sport')}</SectionLabel>
        <View style={styles.sportRow}>
          <SportCard label={t('sport.padel')} selected={sport === 'padel'} accent={colors.padel} onPress={() => setSport('padel')} />
          <SportCard label={t('sport.tennis')} selected={sport === 'tennis'} accent={colors.tennis} onPress={() => setSport('tennis')} />
        </View>

        <SectionLabel accent={accent}>{t('form.modality')}</SectionLabel>
        <SegmentedControl
          accent={accent}
          value={format}
          onChange={(value) => {
            setFormat(value);
            if (value === 'singles') setInitialPlayer(0);
          }}
          options={[
            { value: 'singles', label: t('sport.singles') },
            { value: 'doubles', label: t('sport.doubles') },
          ]}
        />

        <SectionLabel accent={accent}>{format === 'doubles' ? t('form.pairs') : t('form.players')}</SectionLabel>
        <Text style={styles.note}>{t('player.hint')}</Text>
        {format === 'singles' ? (
          <View style={styles.stack}>
            <NameSlot index={0} label={t('label.playerN', { n: 1 })} slots={slots} onPick={pickPlayer} onClear={clearPlayer} />
            <NameSlot index={2} label={t('label.playerN', { n: 2 })} slots={slots} onPick={pickPlayer} onClear={clearPlayer} />
          </View>
        ) : (
          <View style={styles.stack}>
            <Text style={styles.pairLabel}>{t('label.pairN', { n: 1 })}</Text>
            <NameSlot index={0} label={t('label.playerLetter', { letter: 'A' })} slots={slots} onPick={pickPlayer} onClear={clearPlayer} />
            <NameSlot index={1} label={t('label.playerLetter', { letter: 'B' })} slots={slots} onPick={pickPlayer} onClear={clearPlayer} />
            <Text style={[styles.pairLabel, styles.pairGap]}>{t('label.pairN', { n: 2 })}</Text>
            <NameSlot index={2} label={t('label.playerLetter', { letter: 'C' })} slots={slots} onPick={pickPlayer} onClear={clearPlayer} />
            <NameSlot index={3} label={t('label.playerLetter', { letter: 'D' })} slots={slots} onPick={pickPlayer} onClear={clearPlayer} />
          </View>
        )}

        <SectionLabel accent={accent}>{t('form.sets')}</SectionLabel>
        <SegmentedControl
          accent={accent}
          value={setsFormat}
          onChange={setSetsFormat}
          options={[
            { value: 1, label: t('form.set1') },
            { value: 3, label: t('form.setsN', { n: 3 }) },
            { value: 5, label: t('form.setsN', { n: 5 }) },
          ]}
        />

        <SectionLabel accent={accent}>{t('form.deuce')}</SectionLabel>
        <SegmentedControl
          accent={accent}
          value={deuceRule}
          onChange={setDeuceRule}
          options={[
            { value: 'advantage', label: t('form.advantage') },
            { value: 'golden', label: t('form.golden') },
          ]}
        />
        <Text style={styles.note}>{deuceRule === 'advantage' ? t('form.advantageNote') : t('form.goldenNote')}</Text>

        <Pressable
          style={styles.toggle}
          onPress={() => setSuperTiebreak((value) => !value)}
          accessibilityRole="switch"
          accessibilityState={{ checked: superTiebreak }}
        >
          <View style={styles.toggleCopy}>
            <Text style={styles.toggleTitle}>{t('form.super')}</Text>
            <Text style={styles.note}>{superTiebreak ? t('form.superOn') : t('form.superOff')}</Text>
          </View>
          <View style={[styles.switchTrack, superTiebreak && { backgroundColor: accent }]}>
            <View style={[styles.switchThumb, superTiebreak && styles.switchThumbOn]} />
          </View>
        </Pressable>

        <Text style={styles.note}>{t('form.serveNote')}</Text>

        <SectionLabel accent={accent}>{t('form.firstServe')}</SectionLabel>
        <View style={styles.chips}>
          {firstServers.map((choice) => {
            const selected = choice.team === initialTeam && (format === 'singles' || choice.player === initialPlayer);
            return (
              <Pressable
                key={`${choice.team}-${choice.player}`}
                onPress={() => {
                  setInitialTeam(choice.team);
                  setInitialPlayer(choice.player);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('form.servesFirst', { name: shownPlayer(choice.team, choice.player) })}
                style={[styles.chip, selected && { borderColor: accent, backgroundColor: `${accent}22` }]}
              >
                <Text style={[styles.chipText, selected && { color: colors.text }]}>
                  {shownPlayer(choice.team, choice.player)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {format === 'doubles' ? (
          <>
            <Text style={styles.pairLabel}>{t('form.firstOf', { name: teamLabel(draft, otherTeam, copy) })}</Text>
            <View style={styles.chips}>
              {([0, 1] as const).map((player) => {
                const selected = opponentPlayer === player;
                return (
                  <Pressable
                    key={player}
                    onPress={() => setOpponentPlayer(player)}
                    accessibilityRole="button"
                    accessibilityLabel={t('form.opponentServe', { name: shownPlayer(otherTeam, player) })}
                    style={[styles.chip, selected && { borderColor: accent, backgroundColor: `${accent}22` }]}
                  >
                    <Text style={[styles.chipText, selected && { color: colors.text }]}>
                      {shownPlayer(otherTeam, player)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.ticket}>
            <Text style={styles.summary}>{summary}</Text>
          </View>
          <Pressable
            testID={submitTestID}
            accessibilityRole="button"
            accessibilityLabel={submitLabel}
            style={[styles.start, { backgroundColor: accent, shadowColor: accent }]}
            onPress={() => {
              if (confirmSubmit) setConfirmOpen(true);
              else submit();
            }}
          >
            <Text style={styles.startText}>{submitLabel}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {confirmSubmit ? (
        <ConfirmModal
          visible={confirmOpen}
          title={confirmSubmit.title}
          message={confirmSubmit.message}
          confirmLabel={t('form.confirmStart')}
          destructive
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            submit();
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

function SectionLabel({ accent, children }: { accent: string; children: string }) {
  return (
    <View style={styles.sectionRow}>
      <View style={[styles.sectionMark, { backgroundColor: accent }]} />
      <Text style={styles.section}>{children}</Text>
    </View>
  );
}

type PlayerSlotState = { id: string | null; name: string };

function NameSlot({
  index,
  label,
  slots,
  onPick,
  onClear,
}: {
  index: number;
  label: string;
  slots: PlayerSlotState[];
  onPick: (index: number, player: { id: string; name: string }) => void;
  onClear: (index: number) => void;
}) {
  return (
    <PlayerSlot
      label={label}
      playerId={slots[index]?.id ?? null}
      name={slots[index]?.name ?? ''}
      excludeIds={slots.filter((slot, item) => item !== index && slot.id).map((slot) => slot.id as string)}
      onPick={(player) => onPick(index, player)}
      onClear={() => onClear(index)}
    />
  );
}

function SportCard({
  label,
  selected,
  accent,
  onPress,
}: {
  label: string;
  selected: boolean;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.sportCard, selected && { borderColor: accent, backgroundColor: `${accent}1A` }]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Icon name="tennisball" color={selected ? accent : colors.dim} size={28} />
      <Text style={[styles.sportLabel, selected && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  titleCopy: { flex: 1 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.text, fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  titleRule: { width: 42, height: 3, borderRadius: 2, marginTop: 10 },
  cancel: { color: colors.muted, fontSize: 16, fontWeight: '700', paddingTop: 8 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 22, marginBottom: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22, marginBottom: 10 },
  sectionMark: { width: 8, height: 8, borderRadius: 4 },
  section: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sportRow: { flexDirection: 'row', gap: 10 },
  sportCard: {
    flex: 1,
    minHeight: 104,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
  },
  sportLabel: { color: colors.muted, fontSize: 20, fontWeight: '800' },
  stack: { gap: 10 },
  pairLabel: { color: colors.muted, fontSize: 14, fontWeight: '700', marginTop: 4 },
  pairGap: { marginTop: 8 },
  field: { gap: 6 },
  fieldLabel: { color: colors.dim, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  input: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 17,
    fontWeight: '600',
  },
  note: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  toggle: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  toggleCopy: { flex: 1, gap: 4 },
  toggleTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  switchTrack: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  switchThumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.muted },
  switchThumbOn: { marginLeft: 'auto', backgroundColor: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { color: colors.muted, fontSize: 15, fontWeight: '700' },
  footer: { marginTop: 26, gap: 12 },
  ticket: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(17,24,32,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summary: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  start: {
    minHeight: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  startText: { color: colors.ink, fontSize: 18, fontWeight: '800' },
});
