import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

function safe(action: Promise<void>): void {
  void action.catch(() => undefined);
}

/** One pulse for the left side, two pulses for the right, so a pocket press can be told apart. */
export function hapticVolumeSide(team: 0 | 1): void {
  if (Platform.OS !== 'android') {
    hapticPoint();
    return;
  }
  Vibration.vibrate(team === 0 ? 28 : [0, 28, 70, 28]);
}

export function hapticPoint(): void {
  safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticUndo(): void {
  safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function hapticSuccess(): void {
  safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}
