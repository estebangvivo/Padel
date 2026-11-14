import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MatchProvider } from '../context/MatchContext';
import { TournamentProvider } from '../context/TournamentContext';
import { I18nProvider } from '../i18n/I18nContext';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <I18nProvider>
      <MatchProvider>
        <TournamentProvider>
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
            <Stack.Screen name="tournaments" />
            <Stack.Screen name="tournament/new" />
            <Stack.Screen name="tournament/[id]" />
          </Stack>
        </TournamentProvider>
      </MatchProvider>
    </I18nProvider>
  );
}
