import { useMemo } from 'react';
import type { PresentCopy } from '../lib/present';
import { useT } from './I18nContext';

export function usePresentCopy(): PresentCopy {
  const { t, locale } = useT();
  return useMemo(
    () => ({
      playerN: (n) => t('label.playerN', { n }),
      playerLetter: (letter) => t('label.playerLetter', { letter }),
      pairN: (n) => t('label.pairN', { n }),
      setChip: (n) => t('label.setChip', { n }),
      superChip: t('label.superChip'),
      alerts: {
        matchPoint: t('alert.matchPoint'),
        setPoint: t('alert.setPoint'),
        breakPoint: t('alert.breakPoint'),
        goldenPoint: t('alert.goldenPoint'),
        tiebreak: t('alert.tiebreak'),
        superTiebreak: t('alert.superTiebreak'),
      },
      result: t('share.result'),
      beat: t('share.beat'),
      by: t('share.by'),
      padel: t('sport.padel'),
      tennis: t('sport.tennis'),
    }),
    [t, locale],
  );
}
