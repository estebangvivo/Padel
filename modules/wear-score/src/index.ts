import { NativeModule, requireOptionalNativeModule } from 'expo-modules-core';

type WearCommand = { action?: string };

declare class WearScoreModule extends NativeModule<{
  onCommand(event: WearCommand): void;
}> {
  publish(payload: string): void;
}

const native = requireOptionalNativeModule<WearScoreModule>('WearScore');

export function addWearCommandListener(listener: (action: string) => void): { remove: () => void } {
  if (!native) return { remove() {} };
  const subscription = native.addListener('onCommand', (event) => {
    if (event?.action) listener(event.action);
  });
  return { remove: () => subscription.remove() };
}

export function publishWearScore(payload: string): void {
  native?.publish(payload);
}
