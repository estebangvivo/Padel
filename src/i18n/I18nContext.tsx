import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { dictionaries, type MessageKey } from './messages';
import { LOCALE_CHOICES, type Locale } from './locales';
import { LanguagePicker } from '../components/LanguagePicker';

const STORAGE_KEY = 'contador-padel:locale:v1';

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const template = dictionaries[locale][key] ?? dictionaries.es[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

interface I18nValue {
  locale: Locale;
  ready: boolean;
  direction: 'ltr' | 'rtl';
  t: Translate;
  openLanguage: () => void;
}

const I18nContext = createContext<I18nValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return LOCALE_CHOICES.some((choice) => choice.id === value);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [locale, setLocale] = useState<Locale | null>(null);
  const [picker, setPicker] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        if (isLocale(raw)) setLocale(raw);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const choose = useCallback((next: Locale) => {
    setLocale(next);
    setPicker(false);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nValue>(() => {
    const current = locale ?? 'es';
    return {
      locale: current,
      ready,
      direction: current === 'ar' ? 'rtl' : 'ltr',
      t: (key, vars) => translate(current, key, vars),
      openLanguage: () => setPicker(true),
    };
  }, [locale, ready]);

  const showPicker = ready && (locale == null || picker);

  return (
    <I18nContext.Provider value={value}>
      <View style={{ flex: 1, direction: value.direction }}>{children}</View>
      <LanguagePicker
        visible={showPicker}
        selected={locale}
        canClose={locale != null}
        onSelect={choose}
        onClose={() => setPicker(false)}
      />
    </I18nContext.Provider>
  );
}

export function useT(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useT must be used inside I18nProvider');
  return value;
}
