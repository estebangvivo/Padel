import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, View } from 'react-native';
import { MatchSetupForm } from '../components/MatchSetupForm';
import { useMatch } from '../context/MatchContext';
import { useT } from '../i18n/I18nContext';
import { configToSetupInput } from '../lib/scoringEngine';
import { colors } from '../theme';

export default function EditMatchScreen() {
  useKeepAwake('match-edit', { suppressDeactivateWarnings: true });
  const { t } = useT();
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
      kicker={live ? t('edit.kickerLive') : t('edit.kickerResult')}
      title={t('edit.title')}
      subtitle={live ? t('edit.subtitleLive') : t('edit.subtitleDone')}
      submitLabel={t('edit.save')}
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
