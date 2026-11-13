import type { Sport } from './lib/scoringEngine';

export const colors = {
  bg: '#07090C',
  surface: '#111820',
  surfaceRaised: '#1C2736',
  line: '#314056',
  text: '#F6F8FB',
  muted: '#A7B6C8',
  dim: '#738398',
  padel: '#D2F34A',
  tennis: '#5AADFF',
  ink: '#10140C',
  danger: '#FF3B4E',
  warning: '#FFB020',
  gold: '#FFE14A',
  orange: '#FF7A3C',
  tiebreak: '#7AE7FF',
  ball: '#E7FF4A',
};

export function accentFor(sport: Sport): string {
  return sport === 'padel' ? colors.padel : colors.tennis;
}

export function alertColors(type: 'matchPoint' | 'setPoint' | 'breakPoint' | 'goldenPoint'): {
  background: string;
  text: string;
} {
  if (type === 'matchPoint') return { background: colors.danger, text: '#FFFFFF' };
  if (type === 'setPoint') return { background: colors.warning, text: '#1A1203' };
  if (type === 'goldenPoint') return { background: colors.gold, text: '#1A1400' };
  return { background: colors.orange, text: '#1A0C04' };
}
