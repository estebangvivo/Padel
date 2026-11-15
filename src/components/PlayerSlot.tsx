import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { usePlayers } from '../context/PlayersContext';
import { useTournaments } from '../context/TournamentContext';
import { useTitleLookup } from '../context/Titles';
import { useT } from '../i18n/I18nContext';
import {
  DEFAULT_CATEGORY,
  canEnterCategory,
  categoryShortKey,
  type Category,
} from '../lib/category';
import { displayName, exactPlayer, searchPlayers, type DirectoryPlayer } from '../lib/players';
import { colors } from '../theme';
import { CategoryPicker } from './CategoryPicker';
import { menuPortal } from './menuPortal';

let closeOpenSlot: (() => void) | null = null;

interface PlayerSlotProps {
  label: string;
  playerId: string | null;
  name: string;
  excludeIds?: string[];
  tournamentCategory?: Category;
  onPick: (player: { id: string; name: string; category: Category }) => void;
  onClear: () => void;
}

export function PlayerSlot({ label, playerId, name, excludeIds = [], tournamentCategory, onPick, onClear }: PlayerSlotProps) {
  const { t } = useT();
  const { players, addPlayer, setPlayerCategory } = usePlayers();
  const { tournaments } = useTournaments();
  const titlesFor = useTitleLookup();
  const [query, setQuery] = useState('');
  const [signingUp, setSigningUp] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY);
  const [editingCategory, setEditingCategory] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [frame, setFrame] = useState<{ x: number; y: number; width: number } | null>(null);
  const anchorRef = useRef<{
    measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void;
    getBoundingClientRect?: () => { left: number; bottom: number; width: number };
  } | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerInList = useRef(false);
  const closeSelf = useCallback(() => setOpen(false), []);
  const locked = Boolean(playerId) || Boolean(name.trim());

  useEffect(() => () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    if (closeOpenSlot === closeSelf) closeOpenSlot = null;
  }, [closeSelf]);

  function placeMenu() {
    const node = anchorRef.current;
    if (!node) return;
    if (typeof node.getBoundingClientRect === 'function') {
      const rect = node.getBoundingClientRect();
      setFrame({ x: rect.left, y: rect.bottom + 4, width: rect.width });
      return;
    }
    node.measureInWindow?.((x, y, width, height) => {
      setFrame({ x, y: y + height + 4, width });
    });
  }

  function reveal() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    if (closeOpenSlot && closeOpenSlot !== closeSelf) closeOpenSlot();
    closeOpenSlot = closeSelf;
    setOpen(true);
    placeMenu();
  }

  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    placeMenu();
    const update = () => placeMenu();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    setNotice(null);
  }, [tournamentCategory]);

  function entryCup(playerCategory: Category): Category | null {
    if (tournamentCategory != null && !canEnterCategory(playerCategory, tournamentCategory)) return tournamentCategory;
    return null;
  }

  function enrolledCup(playerCategory: Category, id: string): Category | null {
    const enrolled = tournaments.find(
      (cup) =>
        cup.pairs.some((pair) => pair.playerAId === id || pair.playerBId === id) &&
        !canEnterCategory(playerCategory, cup.category),
    );
    return enrolled?.category ?? null;
  }

  function refuse(playerName: string, playerCategory: Category, cup: Category) {
    setNotice(
      t('tour.categoryBlocked', {
        name: playerName,
        category: t(categoryShortKey(playerCategory)),
        tournament: t(categoryShortKey(cup)),
      }),
    );
  }

  function accept(player: DirectoryPlayer) {
    const cup = entryCup(player.category);
    if (cup != null) {
      refuse(player.name, player.category, cup);
      return;
    }
    setNotice(null);
    onPick(player);
  }

  if (locked) {
    const known = playerId ? players.find((player) => player.id === playerId) : undefined;
    const shown = known?.category ?? DEFAULT_CATEGORY;
    const titles = titlesFor(known?.id);
    return (
      <View style={styles.block}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.locked}>
          <Text style={styles.lockedName} numberOfLines={1}>
            {known?.name ?? name}
            {titles > 0 ? <Text style={styles.star}>{` ★${titles}`}</Text> : null}
          </Text>
          {known ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: editingCategory }}
              onPress={() => {
                setNotice(null);
                setEditingCategory((current) => !current);
              }}
              style={styles.badge}
            >
              <Text style={styles.badgeText}>{t(categoryShortKey(shown))}</Text>
            </Pressable>
          ) : (
            <Text style={styles.badgeText}>{t(categoryShortKey(DEFAULT_CATEGORY))}</Text>
          )}
          <Pressable accessibilityRole="button" onPress={onClear}>
            <Text style={styles.change}>{t('player.change')}</Text>
          </Pressable>
        </View>
        {editingCategory && known ? (
          <CategoryPicker
            value={shown}
            floor={known.categoryFloor}
            onChange={(next) => {
              const cup = entryCup(next) ?? enrolledCup(next, known.id);
              if (cup != null) {
                refuse(known.name, next, cup);
                return;
              }
              setNotice(null);
              setPlayerCategory(known.id, next);
              setEditingCategory(false);
            }}
          />
        ) : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </View>
    );
  }

  const trimmed = query.trim();
  const showList = open && !signingUp;
  const matches = (trimmed
    ? searchPlayers(players, trimmed)
    : [...players].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  ).filter((player) => !excludeIds.includes(player.id));
  const existing = exactPlayer(players, trimmed);
  const canCreate = trimmed.length > 1 && !existing;
  const showAdd = showList && !signingUp && (canCreate || trimmed.length === 0);
  const menu = showList && (Platform.OS !== 'web' || frame) ? (
    <View
      style={[
        styles.menu,
        Platform.OS === 'web' && frame
          ? { position: 'fixed', top: frame.y, left: frame.x, width: frame.width }
          : styles.menuInPlace,
      ]}
      onTouchStart={() => { pointerInList.current = true; }}
    >
      {showAdd ? (
        <Pressable
          accessibilityRole="button"
          style={styles.menuAdd}
          onPress={() => {
            setFirstName(trimmed);
            setLastName('');
            setPhone('');
            setCategory(DEFAULT_CATEGORY);
            setNotice(null);
            setSigningUp(true);
            setOpen(true);
          }}
        >
          <Text style={styles.createText}>{canCreate ? t('player.create', { name: trimmed }) : t('player.add')}</Text>
        </Pressable>
      ) : null}
      <ScrollView style={styles.menuList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {matches.map((player) => {
          const blocked = tournamentCategory != null && !canEnterCategory(player.category, tournamentCategory);
          return (
            <Pressable
              key={player.id}
              accessibilityRole="button"
              style={[styles.result, blocked && styles.resultBlocked]}
              onPress={() => accept(player)}
            >
              <Text style={styles.resultText}>
                {player.name}
                {titlesFor(player.id) > 0 ? <Text style={styles.star}>{` ★${titlesFor(player.id)}`}</Text> : null}
              </Text>
              <Text style={[styles.resultMeta, blocked && styles.notice]}>{t(categoryShortKey(player.category))}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  ) : null;

  return (
    <View style={[styles.block, open && styles.blockOpen]}>
      <Text style={styles.label}>{label}</Text>
      <View ref={anchorRef as never} style={styles.anchor}>
      <TextInput
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          setSigningUp(false);
          setNotice(null);
          reveal();
        }}
        placeholder={t('player.search')}
        placeholderTextColor={colors.dim}
        style={styles.input}
        autoCorrect={false}
        selectionColor={colors.padel}
        onTouchStart={() => {
          pointerInList.current = false;
          reveal();
        }}
        onFocus={reveal}
        onBlur={() => {
          blurTimer.current = setTimeout(() => {
            if (!pointerInList.current) {
              setOpen(false);
              if (closeOpenSlot === closeSelf) closeOpenSlot = null;
            }
            pointerInList.current = false;
          }, 200);
        }}
      />
      {Platform.OS === 'web' ? null : menu}
      </View>
      {Platform.OS === 'web' ? menuPortal(menu) : null}
      {signingUp ? (
        <View style={styles.signup}>
          <Text style={styles.label}>{t('player.firstName')}</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder={t('player.firstName')}
            placeholderTextColor={colors.dim}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="words"
            selectionColor={colors.padel}
          />
          <Text style={styles.label}>{t('player.lastName')}</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder={t('player.lastName')}
            placeholderTextColor={colors.dim}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="words"
            selectionColor={colors.padel}
          />
          <Text style={styles.label}>{t('player.phone')}</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="54911…"
            placeholderTextColor={colors.dim}
            style={styles.input}
            keyboardType="phone-pad"
            selectionColor={colors.padel}
          />
          <Text style={styles.hint}>{t('player.optional')}</Text>
          <Text style={styles.label}>{t('player.category')}</Text>
          <CategoryPicker compact value={category} onChange={setCategory} />
          <Text style={styles.hint}>{t('player.categoryHint')}</Text>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          <Pressable
            accessibilityRole="button"
            style={styles.create}
            onPress={() => {
              if (!firstName.trim()) {
                setNotice(t('player.needFirstName'));
                return;
              }
              const named = displayName(firstName, lastName);
              const already = exactPlayer(players, named);
              if (already) {
                setSigningUp(false);
                accept(already);
                return;
              }
              const cup = entryCup(category);
              if (cup != null) {
                refuse(named, category, cup);
                return;
              }
              setNotice(null);
              setSigningUp(false);
              onPick(addPlayer({ firstName, lastName, phone, category }));
            }}
          >
            <Text style={styles.createText}>{t('player.save')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => { setSigningUp(false); setNotice(null); }}>
            <Text style={styles.change}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      ) : null}
      {!signingUp && notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 6, position: 'relative' },
  blockOpen: { zIndex: 20 },
  anchor: { position: 'relative', zIndex: 2 },
  menu: {
    zIndex: 1000,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  menuInPlace: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
  },
  menuList: { maxHeight: 220 },
  label: { color: colors.dim, fontSize: 12, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18 },
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
  result: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  resultBlocked: { borderColor: colors.danger },
  resultText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
  resultMeta: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  create: {
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: colors.padel,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  menuAdd: {
    minHeight: 40,
    backgroundColor: colors.padel,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  createText: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  locked: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lockedName: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '800' },
  badge: {
    minHeight: 32,
    borderRadius: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  badgeText: { color: colors.padel, fontSize: 13, fontWeight: '800' },
  change: { color: colors.padel, fontSize: 14, fontWeight: '800' },
  star: { color: colors.gold, fontWeight: '800' },
  notice: { color: colors.danger, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  signup: { gap: 6 },
});
