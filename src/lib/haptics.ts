import * as Haptics from 'expo-haptics';

function safe(action: Promise<void>): void {
  void action.catch(() => undefined);
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
