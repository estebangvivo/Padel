import { Ionicons } from '@react-native-vector-icons/ionicons';
import type { ComponentProps } from 'react';

export type IonName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, color, size = 22 }: { name: IonName; color: string; size?: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}
