import { useMemo, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CourtWash } from './CourtWash';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const [sport, setSport] = useState<Sport>(initial.sport);
  const [format, setFormat] = useState<MatchFormat>(initial.format);
  const [setsFormat, setSetsFormat] = useState<SetsFormat>(initial.setsFormat);
  const [deuceRule, setDeuceRule] = useState<DeuceRule>(initial.deuceRule);
  const [superTiebreak, setSuperTiebreak] = useState(initial.decidingSuperTiebreak);
  const [names, setNames] = useState<[string, string, string, string]>([
    initial.names[0][0],
    initial.names[0][1],
    initial.names[1][0],
    initial.names[1][1],
  ]);
  const [initialTeam, setInitialTeam] = useState<TeamIndex>(initial.initialServerTeam);
  const [initialPlayer, setInitialPlayer] = useState<PlayerIndex>(initial.initialServerPlayer);
  const [opponentPlayer, setOpponentPlayer] = useState<PlayerIndex>(initial.opponentFirstServer);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const accent = accentFor(sport);
  const draft = useMemo(
    () =>
      createMatchConfig({
        sport,
        format,
        names: [
          [names[0], names[1]],
          [names[2], names[3]],
        ],
        setsFormat,
        deuceRule,
        decidingSuperTiebreak: superTiebreak,
        initialServerTeam: initialTeam,
        initialServerPlayer: format === 'singles' ? 0 : initialPlayer,
        opponentFirstServer: opponentPlayer,
      }),
    [sport, format, names, setsFormat, deuceRule, superTiebreak, initialTeam, initialPlayer, opponentPlayer],
  );

  const serverName = playerLabel(draft, initialTeam, format === 'singles' ? 0 : initialPlayer);
  const summary = [
    sport === 'padel' ? 'Pádel' : 'Tenis',
    format === 'doubles' ? 'Dobles' : 'Singles',
    setsFormat === 1 ? '1 set' : `${setsFormat} sets`,
    deuceRule === 'golden' ? 'Punto de oro' : 'Ventaja',
    superTiebreak ? 'Desempate a 11' : 'Desempate a 7',
    `Saca ${serverName}`,
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

  function updateName(index: number, value: string) {
    setNames((current) => {
      const next = [...current] as [string, string, string, string];
      next[index] = value;
      return next;
    });
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
            <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancelar edición">
              <Text style={styles.cancel}>Cancelar</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {header}

        <SectionLabel accent={accent}>Deporte</SectionLabel>
        <View style={styles.sportRow}>
          <SportCard label="Pádel" selected={sport === 'padel'} accent={colors.padel} onPress={() => setSport('padel')} />
          <SportCard label="Tenis" selected={sport === 'tennis'} accent={colors.tennis} onPress={() => setSport('tennis')} />
        </View>

        <SectionLabel accent={accent}>Modalidad</SectionLabel>
        <SegmentedControl
          accent={accent}
          value={format}
          onChange={(value) => {
            setFormat(value);
            if (value === 'singles') setInitialPlayer(0);
          }}
          options={[
            { value: 'singles', label: 'Singles' },
            { value: 'doubles', label: 'Dobles' },
          ]}
        />

        <SectionLabel accent={accent}>{format === 'doubles' ? 'Parejas' : 'Jugadores'}</SectionLabel>
        {format === 'singles' ? (
          <View style={styles.stack}>
            <Field label="Jugador 1" value={names[0]} placeholder="Jugador 1" accent={accent} onChangeText={(value) => updateName(0, value)} />
            <Field label="Jugador 2" value={names[2]} placeholder="Jugador 2" accent={accent} onChangeText={(value) => updateName(2, value)} />
          </View>
        ) : (
          <View style={styles.stack}>
            <Text style={styles.pairLabel}>Pareja 1</Text>
            <Field label="Jugador A" value={names[0]} placeholder="Jugador A" accent={accent} onChangeText={(value) => updateName(0, value)} />
            <Field label="Jugador B" value={names[1]} placeholder="Jugador B" accent={accent} onChangeText={(value) => updateName(1, value)} />
            <Text style={[styles.pairLabel, styles.pairGap]}>Pareja 2</Text>
            <Field label="Jugador C" value={names[2]} placeholder="Jugador C" accent={accent} onChangeText={(value) => updateName(2, value)} />
            <Field label="Jugador D" value={names[3]} placeholder="Jugador D" accent={accent} onChangeText={(value) => updateName(3, value)} />
          </View>
        )}

        <SectionLabel accent={accent}>Sets</SectionLabel>
        <SegmentedControl
          accent={accent}
          value={setsFormat}
          onChange={setSetsFormat}
          options={[
            { value: 1, label: '1 set' },
            { value: 3, label: '3 sets' },
            { value: 5, label: '5 sets' },
          ]}
        />

        <SectionLabel accent={accent}>En 40-40</SectionLabel>
        <SegmentedControl
          accent={accent}
          value={deuceRule}
          onChange={setDeuceRule}
          options={[
            { value: 'advantage', label: 'Ventaja' },
            { value: 'golden', label: 'Punto de oro' },
          ]}
        />
        <Text style={styles.note}>
          {deuceRule === 'advantage'
            ? '40 iguales, ventaja y game. Si se pierde la ventaja, se vuelve a 40 iguales.'
            : 'En 40 iguales se marca PUNTO DE ORO y el siguiente punto gana el game.'}
        </Text>

        <Pressable
          style={styles.toggle}
          onPress={() => setSuperTiebreak((value) => !value)}
          accessibilityRole="switch"
          accessibilityState={{ checked: superTiebreak }}
        >
          <View style={styles.toggleCopy}>
            <Text style={styles.toggleTitle}>Súper tie-break</Text>
            <Text style={styles.note}>
              {superTiebreak
                ? 'A 6-6 se desempata a 11 puntos, con diferencia de 2.'
                : 'A 6-6 se desempata a 7 puntos, con diferencia de 2.'}
            </Text>
          </View>
          <View style={[styles.switchTrack, superTiebreak && { backgroundColor: accent }]}>
            <View style={[styles.switchThumb, superTiebreak && styles.switchThumbOn]} />
          </View>
        </Pressable>

        <Text style={styles.note}>En el desempate, el primer saque es un punto y después rota cada dos.</Text>

        <SectionLabel accent={accent}>Saque inicial</SectionLabel>
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
                accessibilityLabel={`Saca primero ${playerLabel(draft, choice.team, choice.player)}`}
                style={[styles.chip, selected && { borderColor: accent, backgroundColor: `${accent}22` }]}
              >
                <Text style={[styles.chipText, selected && { color: colors.text }]}>
                  {playerLabel(draft, choice.team, choice.player)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {format === 'doubles' ? (
          <>
            <Text style={styles.pairLabel}>Primer saque de {teamLabel(draft, otherTeam)}</Text>
            <View style={styles.chips}>
              {([0, 1] as const).map((player) => {
                const selected = opponentPlayer === player;
                return (
                  <Pressable
                    key={player}
                    onPress={() => setOpponentPlayer(player)}
                    accessibilityRole="button"
                    accessibilityLabel={`Primer saque rival ${playerLabel(draft, otherTeam, player)}`}
                    style={[styles.chip, selected && { borderColor: accent, backgroundColor: `${accent}22` }]}
                  >
                    <Text style={[styles.chipText, selected && { color: colors.text }]}>
                      {playerLabel(draft, otherTeam, player)}
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
          confirmLabel="Empezar"
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

function Field({
  label,
  value,
  placeholder,
  accent,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  accent: string;
  onChangeText: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.dim}
        style={[styles.input, focused && { borderColor: accent }]}
        autoCorrect={false}
        autoCapitalize="words"
        maxLength={24}
        returnKeyType="done"
        selectionColor={accent}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
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
