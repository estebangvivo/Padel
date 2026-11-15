import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { usePlayers } from './PlayersContext';
import { useTournaments } from './TournamentContext';
import { titlesByPlayer, titlesInCategory, type TitleCounts } from '../lib/titles';

const TitlesContext = createContext<Map<string, TitleCounts>>(new Map());

export function TitleSync({ children }: { children: ReactNode }) {
  const { tournaments } = useTournaments();
  const { players, applyPromotions } = usePlayers();
  const titles = useMemo(() => titlesByPlayer(tournaments), [tournaments]);

  useEffect(() => {
    applyPromotions(titles);
  }, [titles, players, applyPromotions]);

  return <TitlesContext.Provider value={titles}>{children}</TitlesContext.Provider>;
}

export function useTitleLookup(): (playerId?: string | null) => number {
  const titles = useContext(TitlesContext);
  const { players } = usePlayers();
  return (playerId) => {
    const player = playerId ? players.find((item) => item.id === playerId) : undefined;
    if (!player) return 0;
    return titlesInCategory(titles.get(player.id), player.category);
  };
}

export function usePlayerTitles(playerId?: string | null): number {
  return useTitleLookup()(playerId);
}

export function useStarredName(name: string, playerId?: string | null): string {
  const count = usePlayerTitles(playerId);
  if (!name.trim() || count <= 0) return name;
  return `${name.trim()} ★${count}`;
}
