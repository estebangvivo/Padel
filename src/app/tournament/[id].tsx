import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmModal } from '../../components/ConfirmModal';
import { CategoryPicker } from '../../components/CategoryPicker';
import { PlayerSlot } from '../../components/PlayerSlot';
import { usePlayers } from '../../context/PlayersContext';
import { useTournaments } from '../../context/TournamentContext';
import { useTitleLookup } from '../../context/Titles';
import { formatSlotWhen } from '../../i18n/format';
import { useT } from '../../i18n/I18nContext';
import {
  DEFAULT_WALKOVER,
  applyResult,
  assignmentWarning,
  buildSlots,
  createFixture,
  createId,
  acceptMatchScore,
  formatSetScores,
  parseSetScores,
  scoreForWinner,
  setsForBracket,
  whatsAppUrl,
  type FixtureMatch,
  type Pair,
  type SetScore,
  type Tournament,
} from '../../lib/tournament';
import { DEFAULT_CATEGORY, categoryConflict, categoryShortKey, type Category } from '../../lib/category';
import { type SetsFormat } from '../../lib/scoringEngine';
import { colors } from '../../theme';

const BLANK_SETS: SetScore[] = [
  { a: '', b: '' },
  { a: '', b: '' },
];

export default function TournamentScreen() {
  const insets = useSafeAreaInsets();
  const { t, locale } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ready, tournaments, saveTournament, removeTournament, rememberDownloadUrl } = useTournaments();
  const { players } = usePlayers();
  const titlesFor = useTitleLookup();
  const tournament = tournaments.find((item) => item.id === id);
  const [courts, setCourts] = useState(2);
  const [setsFormat, setSetsFormat] = useState<SetsFormat>(3);
  const [categoryPick, setCategoryPick] = useState<Category | null>(null);
  const [walkover, setWalkover] = useState(DEFAULT_WALKOVER);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sets, setSets] = useState<SetScore[]>(BLANK_SETS);
  const [legacyScore, setLegacyScore] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [court, setCourt] = useState<number | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmRebuild, setConfirmRebuild] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState<Record<string, boolean>>({});
  const [rosterOpen, setRosterOpen] = useState(false);
  const category = categoryPick ?? tournament?.category ?? DEFAULT_CATEGORY;

  useEffect(() => {
    if (!tournament) return;
    setCourts(tournament.courts);
    setSetsFormat(tournament.setsFormat);
    setWalkover(tournament.walkoverScore);
    setDownloadUrl(tournament.downloadUrl);
    setCategoryPick(null);
  }, [tournament?.id]);

  const editing = tournament?.matches.find((match) => match.id === editingId) ?? null;
  const conflict = useMemo(() => {
    if (!tournament) return null;
    return categoryConflict(
      tournament.pairs.flatMap((pair) => [pair.playerAId, pair.playerBId]),
      players,
      category,
    );
  }, [tournament, players, category]);
  const rounds = useMemo(() => {
    if (!tournament) return [];
    const numbers = [...new Set(tournament.matches.map((match) => match.round))].sort((a, b) => a - b);
    return numbers.map((round) => ({
      round,
      matches: tournament.matches.filter((match) => match.round === round).sort((a, b) => a.position - b.position),
    }));
  }, [tournament]);

  if (!ready) {
    return (
      <View style={styles.screen}>
        <Text style={styles.muted}>{t('home.loading')}</Text>
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 24, paddingHorizontal: 20 }]}>
        <Text style={styles.title}>{t('tour.empty')}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/tournaments' as Href)}>
          <Text style={styles.link}>{t('common.back')}</Text>
        </Pressable>
      </View>
    );
  }

  function titled(name: string, playerId?: string | null): string {
    const count = titlesFor(playerId);
    const clean = name.trim();
    if (!clean) return '';
    return count > 0 ? `${clean} ★${count}` : clean;
  }

  function labelPair(pairId: string | null): string {
    if (!pairId) return t('tour.tbd');
    const pair = tournament?.pairs.find((item) => item.id === pairId);
    if (!pair) return t('tour.removedPair');
    return [titled(pair.playerA, pair.playerAId), titled(pair.playerB, pair.playerBId)].filter(Boolean).join(' / ') || t('tour.tbd');
  }

  function persist(next: Tournament) {
    saveTournament(next);
  }

  function saveSettings() {
    if (!tournament) return;
    if (conflict && category !== tournament.category) return;
    const next = {
      ...tournament,
      category: conflict ? tournament.category : category,
      courts: Math.max(1, courts),
      setsFormat,
      walkoverScore: walkover.trim() || DEFAULT_WALKOVER,
      downloadUrl: downloadUrl.trim(),
    };
    rememberDownloadUrl(next.downloadUrl);
    persist(next);
  }

  function patchPair(pairId: string, patch: Partial<Pair>) {
    persist({
      ...tournament!,
      pairs: tournament!.pairs.map((pair) => (pair.id === pairId ? { ...pair, ...patch } : pair)),
    });
  }

  function openMatch(match: FixtureMatch) {
    const parsed = setsForBracket(match.score, match.status, match.winnerId === match.pairAId);
    setEditingId(match.id);
    setLegacyScore(parsed || !match.score.trim() ? null : match.score);
    const limit = tournament?.setsFormat ?? 3;
    const shown = parsed && parsed.length > 0 ? parsed.slice(0, limit) : BLANK_SETS.map((set) => ({ ...set }));
    setSets(shown);
    setScoreError(null);
    setSlotId(match.slotId);
    setCourt(match.court);
  }

  function scoreText(): string {
    const typed = formatSetScores(sets);
    if (typed) return typed;
    return legacyScore?.trim() ?? '';
  }

  function scoreIssue(problem: { kind: string; set?: number }): string {
    if (problem.kind === 'extra') return t('tour.scoreExtra');
    if (problem.kind === 'short') return t('tour.scoreShort');
    return t('tour.scoreBadSet', { n: problem.set ?? 1 });
  }

  function commitScore(side: 'a' | 'b' | 'keep') {
    if (!editing || !tournament) return;
    const typed = sets.some((set) => set.a.trim() || set.b.trim());
    if (!typed && side === 'keep') {
      setScoreError(null);
      writeMatch(editing.winnerId, scoreText(), editing.winnerId ? editing.status : 'scheduled');
      return;
    }
    const result = acceptMatchScore(sets, tournament.setsFormat);
    if (!('score' in result)) {
      setScoreError(scoreIssue(result));
      return;
    }
    if (side !== 'keep' && side !== result.winner) {
      setScoreError(t('tour.scoreWinner'));
      return;
    }
    const winnerId = result.winner === 'a' ? editing.pairAId : editing.pairBId;
    setScoreError(null);
    writeMatch(winnerId, result.score, 'finished');
  }

  function applyInjury(winnerIsA: boolean) {
    if (!editing || !tournament) return;
    const nextScore = scoreForWinner(walkover.trim() || DEFAULT_WALKOVER, winnerIsA);
    const nextSets = parseSetScores(nextScore) ?? BLANK_SETS;
    const result = acceptMatchScore(nextSets, tournament.setsFormat);
    setLegacyScore(null);
    setSets(nextSets);
    if (!('score' in result)) {
      setScoreError(scoreIssue(result));
      return;
    }
    setScoreError(null);
    writeMatch(winnerIsA ? editing.pairAId : editing.pairBId, nextScore, 'walkover');
  }

  function patchSet(index: number, side: 'a' | 'b', value: string) {
    const clean = value.replace(/[^\d]/g, '').slice(0, 2);
    setLegacyScore(null);
    setScoreError(null);
    setSets((current) => current.map((set, item) => (item === index ? { ...set, [side]: clean } : set)));
  }

  function writeMatch(winnerId: string | null, nextScore: string, status: FixtureMatch['status'], nextSlot = slotId, nextCourt = court) {
    if (!editing) return;
    let matches = applyResult(tournament!.matches, editing.id, winnerId, nextScore, status);
    matches = matches.map((match) =>
      match.id === editing.id ? { ...match, slotId: nextSlot, court: nextSlot ? nextCourt : null } : match,
    );
    persist({ ...tournament!, matches });
  }

  function pickSlot(next: string | null) {
    if (!editing || !tournament) return;
    setSlotId(next);
    if (!next) {
      setCourt(null);
      return;
    }
    const used = new Set(
      tournament.matches
        .filter((match) => match.id !== editing.id && match.slotId === next && match.court)
        .map((match) => match.court as number),
    );
    if (court && !used.has(court)) return;
    for (let number = 1; number <= tournament.courts; number += 1) {
      if (!used.has(number)) {
        setCourt(number);
        return;
      }
    }
  }

  function messageFor(pair: Pair): string {
    const lines = tournament!.matches
      .filter((match) => match.status !== 'bye' && (match.pairAId === pair.id || match.pairBId === pair.id))
      .map((match) => {
        const opponentId = match.pairAId === pair.id ? match.pairBId : match.pairAId;
        const slot = tournament!.slots.find((item) => item.id === match.slotId);
        const when = slot ? formatSlotWhen(slot, locale) : t('tour.unscheduled');
        const where = match.court ? t('tour.court', { n: match.court }) : '';
        const result = match.score ? ` · ${match.score}` : '';
        return `${when}${where ? ` · ${where}` : ''} · ${t('common.vs')} ${labelPair(opponentId)}${result}`;
      });
    const hello = t('tour.whatsappHello', {
      pair: [titled(pair.playerA, pair.playerAId), titled(pair.playerB, pair.playerBId)].filter(Boolean).join(' / ') || t('label.pairN', { n: tournament!.pairs.indexOf(pair) + 1 }),
      tournament: tournament!.name,
    });
    const link = tournament!.downloadUrl.trim();
    const tail = link ? t('tour.whatsappDownload', { link }) : t('tour.whatsappNoLink');
    return [hello, '', ...lines, '', tail].join('\n');
  }

  async function notify(pair: Pair) {
    const text = messageFor(pair);
    const url = whatsAppUrl(pair.phone, text);
    if (url) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // The share sheet still delivers the same message.
      }
    }
    await Share.share({ message: text });
  }

  const warning = editing ? assignmentWarning(tournament.matches, editing.id, slotId, tournament.courts) : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 36 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable accessibilityRole="button" onPress={() => router.replace('/tournaments' as Href)}>
        <Text style={styles.link}>{t('common.back')}</Text>
      </Pressable>
      <Text style={styles.kicker}>{tournament.format === 'knockout' ? t('tour.knockout') : t('tour.roundRobin')}</Text>
      <Text style={styles.title}>{tournament.name}</Text>
      <Text style={styles.muted}>
        {t(categoryShortKey(tournament.category))} · {tournament.setsFormat === 1 ? t('form.set1') : t('form.setsN', { n: tournament.setsFormat })} · {t('tour.pairCount', { n: tournament.pairs.length })} · {t('tour.matches', { n: tournament.matches.filter((match) => match.status !== 'bye').length })}
        {tournament.status === 'finished' ? ` · ${t('tour.closed')}` : ''}
      </Text>

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.bracketScroll}
        contentContainerStyle={styles.bracketRow}
      >
        {rounds.map((group) => (
          <View key={group.round} style={styles.bracketCol}>
            <Text style={styles.roundTitle}>{t('tour.round', { n: group.round })}</Text>
            <View style={[styles.bracketStack, { minHeight: Math.max(...rounds.map((item) => item.matches.length), 1) * 118 }]}>
              {group.matches.map((match) => {
                const slot = tournament.slots.find((item) => item.id === match.slotId);
                const when = match.status === 'bye' ? t('tour.bye') : slot ? formatSlotWhen(slot, locale) : '—';
                const played = match.status === 'finished' || match.status === 'walkover';
                const sets = played ? setsForBracket(match.score, match.status, match.winnerId === match.pairAId) : null;
                const rawScore = played && match.score.trim() && !sets ? match.score.trim() : '';
                const active = match.id === editingId;
                const scoreLabel = sets ? sets.map((set) => `${set.a}-${set.b}`).join(', ') : rawScore;
                return (
                  <Pressable
                    key={match.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${labelPair(match.pairAId)} ${t('common.vs')} ${labelPair(match.pairBId)} ${scoreLabel} ${when}`}
                    onPress={() => openMatch(match)}
                    style={[styles.bracketCard, active && styles.matchOn]}
                  >
                    <View style={styles.bracketSide}>
                      <Text style={[styles.bracketName, match.winnerId === match.pairAId && match.pairAId ? styles.bracketWin : null]} numberOfLines={1}>
                        {labelPair(match.pairAId)}
                      </Text>
                      {sets?.map((set, index) => (
                        <Text key={index} style={[styles.bracketSet, match.winnerId === match.pairAId ? styles.bracketWin : styles.bracketSetLoss]}>
                          {set.a}
                        </Text>
                      ))}
                    </View>
                    <View style={styles.bracketRule} />
                    <View style={styles.bracketSide}>
                      <Text style={[styles.bracketName, match.winnerId === match.pairBId && match.pairBId ? styles.bracketWin : null]} numberOfLines={1}>
                        {labelPair(match.pairBId)}
                      </Text>
                      {sets?.map((set, index) => (
                        <Text key={index} style={[styles.bracketSet, match.winnerId === match.pairBId ? styles.bracketWin : styles.bracketSetLoss]}>
                          {set.b}
                        </Text>
                      ))}
                    </View>
                    {rawScore ? <Text style={styles.bracketScore} numberOfLines={1}>{rawScore}</Text> : null}
                    <Text style={styles.bracketWhen} numberOfLines={1}>{when}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {editing ? (
        <View style={styles.editor}>
          <Text style={styles.editorTitle}>{t('common.edit')}</Text>
          <Text style={styles.matchTeams}>
            {labelPair(editing.pairAId)} {t('common.vs')} {labelPair(editing.pairBId)}
          </Text>
          {editing.status === 'bye' ? <Text style={styles.note}>{t('tour.bye')}</Text> : null}
          {editing.status !== 'bye' ? (
            <>
          <Text style={styles.label}>{t('tour.days')}</Text>
          <View style={styles.chips}>
            <Pressable accessibilityRole="button" onPress={() => pickSlot(null)} style={[styles.chip, slotId == null && styles.chipOn]}>
              <Text style={[styles.chipText, slotId == null && styles.chipTextOn]}>{t('tour.unscheduled')}</Text>
            </Pressable>
            {tournament.slots.map((slot) => {
              const selected = slotId === slot.id;
              return (
                <Pressable key={slot.id} accessibilityRole="button" onPress={() => pickSlot(slot.id)} style={[styles.chip, selected && styles.chipOn]}>
                  <Text style={[styles.chipText, selected && styles.chipTextOn]}>{formatSlotWhen(slot, locale)}</Text>
                </Pressable>
              );
            })}
          </View>
          {slotId ? (
            <>
              <Text style={styles.label}>{t('tour.court', { n: court ?? 1 })}</Text>
              <Stepper value={court ?? 1} min={1} max={Math.max(courts, 1)} onChange={setCourt} />
            </>
          ) : null}
          {warning === 'pair' ? <Text style={styles.warn}>{t('tour.slotConflict')}</Text> : null}
          {warning === 'court' ? <Text style={styles.warn}>{t('tour.courtConflict')}</Text> : null}
          <Text style={styles.label}>{t('tour.score')}</Text>
          <Text style={styles.note}>{labelPair(editing.pairAId)}  –  {labelPair(editing.pairBId)}</Text>
          {sets.map((set, index) => (
            <View key={index} style={styles.setRow}>
              <Text style={styles.setLabel}>{t('tour.setN', { n: index + 1 })}</Text>
              <TextInput
                value={set.a}
                onChangeText={(value) => patchSet(index, 'a', value)}
                keyboardType="number-pad"
                maxLength={2}
                style={styles.setInput}
                selectionColor={colors.padel}
              />
              <Text style={styles.setDash}>-</Text>
              <TextInput
                value={set.b}
                onChangeText={(value) => patchSet(index, 'b', value)}
                keyboardType="number-pad"
                maxLength={2}
                style={styles.setInput}
                selectionColor={colors.padel}
              />
              {sets.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('tour.remove')}
                  onPress={() => {
                    setScoreError(null);
                    setSets((current) => current.filter((_, item) => item !== index));
                  }}
                >
                  <Text style={styles.setRemove}>×</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          {sets.length < tournament.setsFormat ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setScoreError(null);
                setSets((current) => [...current, { a: '', b: '' }]);
              }}
            >
              <Text style={styles.addSet}>{t('tour.addSet')}</Text>
            </Pressable>
          ) : null}
          {scoreError ? <Text style={styles.error}>{scoreError}</Text> : null}
          {legacyScore ? <Text style={styles.note}>{legacyScore}</Text> : null}
          {editing.pairAId && editing.pairBId ? (
            <>
              <Text style={styles.note}>{t('tour.injuredHint')}</Text>
              <Pressable accessibilityRole="button" style={styles.danger} onPress={() => applyInjury(false)}>
                <Text style={styles.dangerText}>{t('tour.injuredA', { name: labelPair(editing.pairAId) })}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={styles.danger} onPress={() => applyInjury(true)}>
                <Text style={styles.dangerText}>{t('tour.injuredA', { name: labelPair(editing.pairBId) })}</Text>
              </Pressable>
              <View style={styles.row}>
                <Pressable accessibilityRole="button" style={styles.option} onPress={() => commitScore('a')}>
                  <Text style={styles.optionText}>{t('tour.winner')}: {labelPair(editing.pairAId)}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" style={styles.option} onPress={() => commitScore('b')}>
                  <Text style={styles.optionText}>{t('tour.winner')}: {labelPair(editing.pairBId)}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Text style={styles.note}>{t('tour.noOpponent')}</Text>
          )}
          <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => commitScore('keep')}>
            <Text style={styles.secondaryText}>{t('common.save')}</Text>
          </Pressable>
          {editing.winnerId ? (
            <Pressable accessibilityRole="button" onPress={() => { setSets(BLANK_SETS.map((set) => ({ ...set }))); setLegacyScore(null); writeMatch(null, '', 'scheduled'); }}>
              <Text style={styles.remove}>{t('tour.clearResult')}</Text>
            </Pressable>
          ) : null}
            </>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.section}>{t('tour.settings')}</Text>
      <Text style={styles.label}>{t('tour.category')}</Text>
      <Text style={styles.note}>{t('tour.categoryHint')}</Text>
      <CategoryPicker value={category} onChange={setCategoryPick} />
      {conflict ? (
        <Text style={styles.error}>
          {t('tour.categoryBlocked', {
            name: conflict.name,
            category: t(categoryShortKey(conflict.category)),
            tournament: t(categoryShortKey(category)),
          })}
        </Text>
      ) : null}
      <Text style={styles.label}>{t('tour.sets')}</Text>
      <Text style={styles.note}>{t('tour.setsHint')}</Text>
      <View style={styles.choiceRow}>
        {([1, 3, 5] as const).map((option) => {
          const selected = setsFormat === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              onPress={() => setSetsFormat(option)}
              style={[styles.option, selected && styles.optionOn]}
            >
              <Text style={[styles.optionText, selected && styles.chipTextOn]}>
                {option === 1 ? t('form.set1') : t('form.setsN', { n: option })}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.label}>{t('tour.courts')}</Text>
      <Stepper value={courts} min={1} max={16} onChange={setCourts} />
      <Field label={t('tour.walkover')} value={walkover} onChangeText={setWalkover} />
      <Text style={styles.note}>{t('tour.walkoverHint')}</Text>
      <Field label={t('tour.download')} value={downloadUrl} onChangeText={setDownloadUrl} />
      <Pressable accessibilityRole="button" style={styles.secondary} onPress={saveSettings}>
        <Text style={styles.secondaryText}>{t('common.save')}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: rosterOpen }}
        style={styles.secondary}
        onPress={() => setRosterOpen((current) => !current)}
      >
        <Text style={styles.secondaryText}>{rosterOpen ? t('tour.hideRoster') : t('tour.showRoster')}</Text>
      </Pressable>

      {rosterOpen ? (
        <>
      <Text style={styles.section}>{t('tour.notify')}</Text>
      <Text style={styles.note}>{t('tour.notifyHint')}</Text>
      <Text style={styles.note}>{t('tour.noPhone')}</Text>
      {tournament.pairs.map((pair, index) => (
        <View key={pair.id} style={styles.pairRow}>
          <View style={styles.pairCopy}>
            <Text style={styles.matchTeams}>{[titled(pair.playerA, pair.playerAId), titled(pair.playerB, pair.playerBId)].filter(Boolean).join(' / ') || t('label.pairN', { n: index + 1 })}</Text>
            <Text style={styles.matchMeta}>{pair.phone || t('tour.noPhone')}</Text>
          </View>
          <Pressable accessibilityRole="button" style={styles.whatsapp} onPress={() => void notify(pair)}>
            <Text style={styles.whatsappText}>{pair.phone.replace(/\D/g, '').length >= 8 ? t('tour.whatsapp') : t('tour.share')}</Text>
          </Pressable>
        </View>
      ))}

      <Text style={styles.section}>{t('tour.roster')}</Text>
      {tournament.pairs.map((pair, index) => (
        <View key={pair.id} style={styles.editor}>
          <View style={styles.pairHead}>
            <Text style={styles.editorTitle}>{t('label.pairN', { n: index + 1 })}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => persist({ ...tournament, pairs: tournament.pairs.filter((item) => item.id !== pair.id) })}
            >
              <Text style={styles.remove}>{t('tour.remove')}</Text>
            </Pressable>
          </View>
          <PlayerSlot
            label={t('tour.playerA')}
            playerId={pair.playerAId ?? null}
            name={pair.playerA}
            excludeIds={pair.playerBId ? [pair.playerBId] : []}
            tournamentCategory={category}
            onPick={(player) => patchPair(pair.id, { playerA: player.name, playerAId: player.id })}
            onClear={() => patchPair(pair.id, { playerA: '', playerAId: null })}
          />
          <PlayerSlot
            label={t('tour.playerB')}
            playerId={pair.playerBId ?? null}
            name={pair.playerB}
            excludeIds={pair.playerAId ? [pair.playerAId] : []}
            tournamentCategory={category}
            onPick={(player) => patchPair(pair.id, { playerB: player.name, playerBId: player.id })}
            onClear={() => patchPair(pair.id, { playerB: '', playerBId: null })}
          />
          <Field label={t('tour.phone')} value={pair.phone} onChangeText={(value) => patchPair(pair.id, { phone: value })} />
          {tournament.slots.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: Boolean(prefsOpen[pair.id]) }}
              style={[styles.secondary, prefsOpen[pair.id] && styles.chipOn]}
              onPress={() => setPrefsOpen((current) => ({ ...current, [pair.id]: !current[pair.id] }))}
            >
              <Text style={[styles.secondaryText, prefsOpen[pair.id] && { color: colors.ink }]}>
                {t('tour.preferences')}
                {pair.preferredSlotIds.length > 0 ? ` · ${pair.preferredSlotIds.length}` : ''}
              </Text>
            </Pressable>
          ) : null}
          {prefsOpen[pair.id] ? (
            <>
              <Text style={styles.note}>{t('tour.preferencesHint')}</Text>
              <View style={styles.chips}>
                {tournament.slots.map((slot) => {
                  const selected = pair.preferredSlotIds.includes(slot.id);
                  return (
                    <Pressable
                      key={slot.id}
                      accessibilityRole="button"
                      onPress={() =>
                        patchPair(pair.id, {
                          preferredSlotIds: selected
                            ? pair.preferredSlotIds.filter((item) => item !== slot.id)
                            : [...pair.preferredSlotIds, slot.id],
                        })
                      }
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
      <Pressable
        accessibilityRole="button"
        style={styles.secondary}
        onPress={() =>
          persist({
            ...tournament,
            pairs: [...tournament.pairs, { id: createId('pair'), playerA: '', playerB: '', phone: '', playerAId: null, playerBId: null, preferredSlotIds: [] }],
          })
        }
      >
        <Text style={styles.secondaryText}>{t('tour.addPair')}</Text>
      </Pressable>
        </>
      ) : null}
      <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => setConfirmRebuild(true)}>
        <Text style={styles.secondaryText}>{t('tour.regenerate')}</Text>
      </Pressable>
      {tournament.status === 'finished' ? (
        <Pressable
          accessibilityRole="button"
          style={styles.secondary}
          onPress={() => persist({ ...tournament, status: 'active' })}
        >
          <Text style={styles.secondaryText}>{t('tour.reopen')}</Text>
        </Pressable>
      ) : (
        <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => setConfirmFinish(true)}>
          <Text style={styles.secondaryText}>{t('tour.close')}</Text>
        </Pressable>
      )}
      <Pressable accessibilityRole="button" onPress={() => setConfirmDelete(true)}>
        <Text style={styles.remove}>{t('common.delete')}</Text>
      </Pressable>

      <ConfirmModal
        visible={confirmFinish}
        title={t('tour.closeTitle')}
        message={t('tour.closeMessage')}
        confirmLabel={t('tour.close')}
        onCancel={() => setConfirmFinish(false)}
        onConfirm={() => {
          setConfirmFinish(false);
          persist({ ...tournament, status: 'finished' });
          router.replace('/tournaments' as Href);
        }}
      />

      <ConfirmModal
        visible={confirmDelete}
        title={t('tour.deleteTitle')}
        message={t('tour.deleteMessage')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          removeTournament(tournament.id);
          router.replace('/tournaments' as Href);
        }}
      />
      <ConfirmModal
        visible={confirmRebuild}
        title={t('tour.regenerateTitle')}
        message={t('tour.regenerateMessage')}
        confirmLabel={t('tour.regenerate')}
        destructive
        onCancel={() => setConfirmRebuild(false)}
        onConfirm={() => {
          setConfirmRebuild(false);
          const nextCourts = Math.max(1, courts);
          const slots = buildSlots(tournament.days, tournament.matchMinutes);
          const next: Tournament = {
            ...tournament,
            courts: nextCourts,
            setsFormat,
            walkoverScore: walkover.trim() || DEFAULT_WALKOVER,
            downloadUrl: downloadUrl.trim(),
            category: conflict ? tournament.category : category,
            slots,
            matches: createFixture(tournament.pairs, slots, nextCourts, tournament.format),
          };
          rememberDownloadUrl(next.downloadUrl);
          setEditingId(null);
          persist(next);
        }}
      />
    </ScrollView>
  );
}

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
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
  kicker: { color: colors.padel, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: 15 },
  error: { color: colors.danger, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  link: { color: colors.muted, fontSize: 16, fontWeight: '700' },
  section: { color: colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 18 },
  label: { color: colors.dim, fontSize: 12, fontWeight: '700' },
  note: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  field: { gap: 6 },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 16,
  },
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
  bracketScroll: { marginHorizontal: -20 },
  bracketRow: { paddingHorizontal: 20, gap: 16, alignItems: 'flex-start' },
  bracketCol: { width: 248, gap: 8 },
  bracketStack: { justifyContent: 'space-around', gap: 12 },
  bracketCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  bracketSide: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  bracketName: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '800' },
  bracketSet: { minWidth: 16, textAlign: 'center', fontSize: 14, fontWeight: '800' },
  bracketSetLoss: { color: colors.muted },
  bracketScore: { color: colors.padel, fontSize: 12, fontWeight: '800', paddingHorizontal: 12 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setLabel: { width: 52, color: colors.dim, fontSize: 13, fontWeight: '700' },
  setInput: {
    width: 56,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
  },
  setDash: { width: 10, color: colors.dim, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  addSet: { color: colors.padel, fontSize: 15, fontWeight: '800' },
  setRemove: { width: 28, color: colors.danger, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  bracketWin: { color: colors.padel },
  bracketRule: { height: 1, backgroundColor: colors.line },
  bracketWhen: { color: colors.muted, fontSize: 12, fontWeight: '700', paddingHorizontal: 12, paddingBottom: 10 },
  roundTitle: { color: colors.muted, fontSize: 13, fontWeight: '800', letterSpacing: 0.6 },
  match: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 4,
  },
  matchOn: { borderColor: colors.padel },
  matchTeams: { color: colors.text, fontSize: 16, fontWeight: '800' },
  matchMeta: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  editor: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 8,
  },
  editorTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
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
  warn: { color: colors.warning, fontSize: 13, fontWeight: '700' },
  danger: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dangerText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  row: { gap: 8 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionOn: { backgroundColor: colors.padel, borderColor: colors.padel },
  option: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  optionText: { color: colors.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  remove: { color: colors.danger, fontSize: 15, fontWeight: '700', textAlign: 'center', paddingVertical: 8 },
  pairRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pairCopy: { flex: 1, gap: 2 },
  whatsapp: {
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: colors.padel,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  pairHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.text, fontSize: 22, fontWeight: '700' },
  stepValue: { color: colors.text, fontSize: 22, fontWeight: '800', minWidth: 28, textAlign: 'center' },
});
