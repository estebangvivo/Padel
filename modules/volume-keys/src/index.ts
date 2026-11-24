import { NativeModule, requireOptionalNativeModule } from 'expo-modules-core';

type VolumeKeyEvent = { action?: string };

declare class VolumeKeysModule extends NativeModule<{
  onVolumeKey(event: VolumeKeyEvent): void;
}> {}

const native = requireOptionalNativeModule<VolumeKeysModule>('VolumeKeys');

export function addVolumeKeyListener(listener: (action: string) => void): { remove: () => void } {
  if (!native) return { remove() {} };
  const subscription = native.addListener('onVolumeKey', (event) => {
    if (event?.action) listener(event.action);
  });
  return { remove: () => subscription.remove() };
}
