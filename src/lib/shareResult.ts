import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

export async function copyResult(message: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(message);
    return true;
  } catch {
    return false;
  }
}

export async function shareResult(message: string): Promise<'shared' | 'dismissed' | 'copied-only'> {
  try {
    await Clipboard.setStringAsync(message);
  } catch {
    // The share sheet can still deliver the text when the clipboard is unavailable.
  }

  try {
    const result = await Share.share({ message, title: 'Resultado' });
    if (result.action === Share.dismissedAction) return 'dismissed';
    return 'shared';
  } catch {
    return 'copied-only';
  }
}
