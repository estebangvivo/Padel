import type { TimeSlot } from '../lib/tournament';
import type { Locale } from './locales';

export const localeTag: Record<Locale, string> = {
  es: 'es-AR',
  en: 'en-GB',
  pt: 'pt-BR',
  it: 'it-IT',
  fr: 'fr-FR',
  ar: 'ar-QA',
};

export function formatSlotWhen(slot: TimeSlot, locale: Locale): string {
  const [year, month, day] = slot.date.split('-').map(Number);
  const date = new Date(year || 2026, (month || 1) - 1, day || 1);
  const label = date.toLocaleDateString(localeTag[locale], { weekday: 'short', day: 'numeric', month: 'short' });
  return `${label} ${slot.start}`;
}

export function formatLongDay(iso: string, locale: Locale): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year || 2026, (month || 1) - 1, day || 1);
  return date.toLocaleDateString(localeTag[locale], { weekday: 'short', day: 'numeric', month: 'short' });
}
