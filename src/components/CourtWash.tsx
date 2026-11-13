import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, type ColorValue } from 'react-native';
import { colors } from '../theme';

export function CourtWash({ accent }: { accent: string }) {
  const wash = [`${accent}33`, colors.bg, colors.bg] as [ColorValue, ColorValue, ColorValue];
  return <LinearGradient colors={wash} locations={[0, 0.38, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />;
}
