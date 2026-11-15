import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n/I18nContext';
import type { PlayerAccount } from '../lib/account';
import { DEFAULT_CATEGORY, type Category } from '../lib/category';
import { colors } from '../theme';
import { CategoryPicker } from './CategoryPicker';
import { Icon } from './Icon';

interface AccountFormProps {
  visible: boolean;
  account: PlayerAccount | null;
  canClose: boolean;
  onSave: (name: string, phone: string, category: Category) => void;
  onClose: () => void;
}

export function AccountForm({ visible, account, canClose, onSave, onClose }: AccountFormProps) {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const [name, setName] = useState(account?.name ?? '');
  const [phone, setPhone] = useState(account?.phone ?? '');
  const [category, setCategory] = useState<Category>(account?.category ?? DEFAULT_CATEGORY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(account?.name ?? '');
    setPhone(account?.phone ?? '');
    setCategory(account?.category ?? DEFAULT_CATEGORY);
    setError(null);
  }, [visible, account?.id, account?.name, account?.phone, account?.category]);

  function save() {
    if (!name.trim()) {
      setError(t('account.needName'));
      return;
    }
    onSave(name, phone, category);
  }

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => (canClose ? onClose() : undefined)}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.copy}>
            <Text style={styles.kicker}>{t('account.kicker')}</Text>
            <Text style={styles.title}>{t('account.title')}</Text>
            <Text style={styles.subtitle}>{t('account.subtitle')}</Text>
          </View>
          {canClose ? (
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={8} style={styles.close}>
              <Icon name="close" color={colors.text} size={22} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.label}>{t('account.name')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('account.name')}
          placeholderTextColor={colors.dim}
          style={styles.input}
          autoCorrect={false}
          selectionColor={colors.padel}
        />
        <Text style={styles.label}>{t('account.phone')}</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="54911…"
          placeholderTextColor={colors.dim}
          keyboardType="phone-pad"
          style={styles.input}
          selectionColor={colors.padel}
        />
        <Text style={styles.label}>{t('player.category')}</Text>
        <CategoryPicker value={category} floor={account?.categoryFloor} onChange={setCategory} />
        <Text style={styles.hint}>{t('player.categoryHint')}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable accessibilityRole="button" style={styles.save} onPress={save}>
          <Text style={styles.saveText}>{t('account.save')}</Text>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 },
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
  label: { color: colors.dim, fontSize: 12, fontWeight: '700', marginTop: 8 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 17,
  },
  error: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  save: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.padel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: colors.ink, fontSize: 16, fontWeight: '800' },
});
