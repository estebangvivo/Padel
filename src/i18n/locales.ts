export const LOCALES = ['es', 'en', 'pt', 'it', 'fr', 'ar'] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_CHOICES: { id: Locale; label: string; hint?: string }[] = [
  { id: 'es', label: 'Castellano' },
  { id: 'en', label: 'English' },
  { id: 'pt', label: 'Português' },
  { id: 'it', label: 'Italiano' },
  { id: 'fr', label: 'Français' },
  { id: 'ar', label: 'العربية', hint: 'Qatar' },
];
