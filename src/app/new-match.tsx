import { router, type Href } from 'expo-router';
import { MatchSetupForm } from '../components/MatchSetupForm';
import { useMatch } from '../context/MatchContext';
import { useT } from '../i18n/I18nContext';
import type { SetupInput } from '../lib/scoringEngine';

const NEW_MATCH: SetupInput = {
  sport: 'padel',
  format: 'doubles',
  names: [
    ['', ''],
    ['', ''],
  ],
  setsFormat: 3,
  deuceRule: 'advantage',
  decidingSuperTiebreak: false,
  initialServerTeam: 0,
  initialServerPlayer: 0,
  opponentFirstServer: 0,
};

export default function NewMatchScreen() {
  const { t } = useT();
  const { match, startMatch } = useMatch();
  const live = match?.state.status === 'live';

  return (
    <MatchSetupForm
      kicker={t('home.kicker')}
      title={t('home.title')}
      subtitle={t('home.subtitle')}
      submitLabel={t('home.start')}
      submitTestID="start-match"
      initial={NEW_MATCH}
      onCancel={() => router.replace('/' as Href)}
      confirmSubmit={
        live
          ? {
              title: t('home.overwriteTitle'),
              message: t('home.overwriteMessage'),
            }
          : null
      }
      onSubmit={(config) => {
        startMatch(config);
        router.replace('/match');
      }}
    />
  );
}
