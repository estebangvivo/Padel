import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { AccountProvider } from '../context/AccountContext';
import { MatchProvider } from '../context/MatchContext';
import { PlayersProvider } from '../context/PlayersContext';
import { TournamentProvider } from '../context/TournamentContext';
import { WearSync } from '../components/WearSync';
import { TitleSync } from '../context/Titles';
import { I18nProvider } from '../i18n/I18nContext';
import { ensureDemoOctava } from '../lib/demoOctava';
import { colors } from '../theme';

function DemoGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    ensureDemoOctava()
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);
  if (!ready) return null;
  return children;
}

export default function RootLayout() {
  return (
    <I18nProvider>
      <DemoGate>
      <AccountProvider>
      <PlayersProvider>
      <MatchProvider>
        <TournamentProvider>
          <TitleSync>
          <WearSync />
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="new-match" />
            <Stack.Screen name="match" options={{ gestureEnabled: false }} />
            <Stack.Screen name="edit" />
            <Stack.Screen name="summary" options={{ gestureEnabled: false }} />
            <Stack.Screen name="tournaments" />
            <Stack.Screen name="tournament/new" />
            <Stack.Screen name="tournament/[id]" />
          </Stack>
          </TitleSync>
        </TournamentProvider>
      </MatchProvider>
      </PlayersProvider>
      </AccountProvider>
      </DemoGate>
    </I18nProvider>
  );
}
