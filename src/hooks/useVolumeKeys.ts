import { useEffect, useRef } from 'react';
import { addVolumeKeyListener } from 'volume-keys';
import { interpretVolumeKey } from '../lib/volumeKeys';

interface VolumeKeyHandlers {
  onPoint: (team: 0 | 1) => void;
  onUndo: () => void;
}

export function useVolumeKeys(active: boolean, handlers: VolumeKeyHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!active) return;
    const subscription = addVolumeKeyListener((action) => {
      const decision = interpretVolumeKey(action);
      if (!decision) return;
      if (decision.kind === 'undo') handlersRef.current.onUndo();
      else handlersRef.current.onPoint(decision.team);
    });
    return () => subscription.remove();
  }, [active]);
}
