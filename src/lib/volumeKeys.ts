export type VolumeKeyDecision = { kind: 'point'; team: 0 | 1 } | { kind: 'undo' };

/** Volume up scores the left side. Volume down scores the right side. A hold undoes. */
export function interpretVolumeKey(action: string): VolumeKeyDecision | null {
  if (action === 'up') return { kind: 'point', team: 0 };
  if (action === 'down') return { kind: 'point', team: 1 };
  if (action === 'undo') return { kind: 'undo' };
  return null;
}
