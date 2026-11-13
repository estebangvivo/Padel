import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, View } from 'react-native';
import { MatchSetupForm } from '../components/MatchSetupForm';
import { useMatch } from '../context/MatchContext';
import { configToSetupInput } from '../lib/scoringEngine';
import { colors } from '../theme';

export default function EditMatchScreen() {
  useKeepAwake('match-edit', { suppressDeactivateWarnings: true });
  const { ready, match, updateConfig } = useMatch();
  const live = match?.state.status === 'live';

  useEffect(() => {
    if (!ready) return;
    if (!match) router.replace('/');
  }, [ready, match]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) router.back();
      else router.replace(live ? '/match' : '/');
      return true;
    });
    return () => subscription.remove();
  }, [live]);

  if (!ready || !match) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <MatchSetupForm
      kicker={live ? 'PARTIDO EN CURSO' : 'RESULTADO'}
      title="Editar datos"
      subtitle={
        live
          ? 'Podés corregir nombres, saque y reglas. El marcador y el tiempo no se reinician.'
          : 'Podés corregir nombres y el texto del resultado. Los games ya jugados siguen igual.'
      }
      submitLabel="Guardar cambios"
      submitTestID="save-match"
      initial={configToSetupInput(match.config)}
      onCancel={() => {
        if (router.canGoBack()) router.back();
        else router.replace(live ? '/match' : '/summary');
      }}
      onSubmit={(config) => {
        const result = updateConfig(config);
        if (result === 'finished' && live) router.replace('/summary');
        else if (router.canGoBack()) router.back();
        else router.replace(result === 'finished' ? '/summary' : '/match');
      }}
    />
  );
}
