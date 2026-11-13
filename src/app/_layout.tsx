import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MatchProvider } from '../context/MatchContext';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <MatchProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="match" options={{ gestureEnabled: false }} />
        <Stack.Screen name="edit" />
        <Stack.Screen name="summary" options={{ gestureEnabled: false }} />
      </Stack>
    </MatchProvider>
  );
}
