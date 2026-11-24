import { useCallback, useEffect, useRef } from 'react';
import { useMatch } from '../context/MatchContext';
import { useT } from '../i18n/I18nContext';
import { usePresentCopy } from '../i18n/presentCopy';
import { hapticSuccess, hapticUndo, hapticVolumeSide } from '../lib/haptics';
import { buildWearSnapshot, interpretWearCommand } from '../lib/wearScore';
import { addWearCommandListener, publishWearScore } from 'wear-score';

export function WearSync() {
  const { ready, match, addPoint, undo } = useMatch();
  const copy = usePresentCopy();
  const { t } = useT();
  const readyRef = useRef(ready);
  const matchRef = useRef(match);
  readyRef.current = ready;
  matchRef.current = match;

  const apply = useCallback(
    (action: string) => {
      const current = matchRef.current;
      if (!readyRef.current || !current || current.state.status !== 'live') return;
      const command = interpretWearCommand(action);
      if (command === 'undo') {
        if (undo()) hapticUndo();
        return;
      }
      if (command === null) return;
      const result = addPoint(command);
      if (result === 'match') hapticSuccess();
      else if (result === 'point') hapticVolumeSide(command);
    },
    [addPoint, undo],
  );

  useEffect(() => addWearCommandListener(apply).remove, [apply]);

  useEffect(() => {
    if (!ready) return;
    publishWearScore(
      JSON.stringify(
        buildWearSnapshot(match, copy, {
          idle: t('wear.idle'),
          finished: t('wear.finished'),
        }),
      ),
    );
  }, [ready, match, copy, t]);

  return null;
}
