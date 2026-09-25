import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import {createZustandStorage} from '../storage/StorageService';
import {dayKey, type ViewingTitleStats} from '../utils/viewingStats';

const MAX_TITLES = 500;
const MAX_TICK_MS = 6000;
const RETENTION_MS = 400 * 86400000;

export interface ViewingSessionMeta {
  mediaId: string;
  title?: string;
  poster?: string;
  infoUrl?: string;
  providerValue?: string;
  type?: string;
}

interface ViewingTick extends ViewingSessionMeta {
  ms: number;
  isPlay: boolean;
  at: number;
}

interface ViewingStatsState {
  titles: Record<string, ViewingTitleStats>;
  recordTick: (tick: ViewingTick) => void;
  clearStats: () => void;
}

function prune(
  titles: Record<string, ViewingTitleStats>,
  now: number,
): Record<string, ViewingTitleStats> {
  const cutoff = dayKey(now - RETENTION_MS);
  let next = titles;

  for (const [id, entry] of Object.entries(titles)) {
    if (!Object.keys(entry.days).some(key => key < cutoff)) {
      continue;
    }
    if (next === titles) {
      next = {...titles};
    }
    const days: ViewingTitleStats['days'] = {};
    let totalMs = 0;
    let totalPlays = 0;
    for (const [key, stat] of Object.entries(entry.days)) {
      if (key < cutoff) {
        continue;
      }
      days[key] = stat;
      totalMs += stat.ms;
      totalPlays += stat.plays;
    }
    next[id] = {...entry, days, totalMs, totalPlays};
  }

  const ids = Object.keys(next);
  if (ids.length > MAX_TITLES) {
    const current = next;
    const overflow = [...ids]
      .sort(
        (a, b) =>
          (current[a].lastWatchedAt || 0) - (current[b].lastWatchedAt || 0),
      )
      .slice(0, ids.length - MAX_TITLES);
    if (overflow.length > 0) {
      next = {...next};
      for (const id of overflow) {
        delete next[id];
      }
    }
  }

  return next;
}

export const useViewingStatsStore = create<ViewingStatsState>()(
  persist(
    set => ({
      titles: {},
      recordTick: ({
        mediaId,
        title,
        poster,
        infoUrl,
        providerValue,
        type,
        ms,
        isPlay,
        at,
      }) => {
        if (!mediaId || (!isPlay && ms <= 0)) {
          return;
        }
        set(state => {
          const prev = state.titles[mediaId];
          const key = dayKey(at);
          const day = prev?.days[key] ?? {ms: 0, plays: 0};
          if (ms > 0) {
            day.ms += ms;
          }
          if (isPlay) {
            day.plays += 1;
          }
          const entry: ViewingTitleStats = {
            id: mediaId,
            title: title || prev?.title || 'Unknown title',
            poster: poster ?? prev?.poster,
            infoUrl: infoUrl ?? prev?.infoUrl,
            providerValue: providerValue ?? prev?.providerValue,
            type: type ?? prev?.type,
            days: {...(prev?.days ?? {}), [key]: day},
            totalMs: (prev?.totalMs ?? 0) + (ms > 0 ? ms : 0),
            totalPlays: (prev?.totalPlays ?? 0) + (isPlay ? 1 : 0),
            lastWatchedAt: at,
          };
          return {titles: prune({...state.titles, [mediaId]: entry}, at)};
        });
      },
      clearStats: () => set({titles: {}}),
    }),
    {
      name: 'viewing-stats-storage',
      storage: createJSONStorage(() => createZustandStorage()),
    },
  ),
);

/**
 * Tracks playback progress for a single title and converts position updates
 * into watch-time ticks for the statistics screen.
 */
export function beginViewingSession(meta: ViewingSessionMeta) {
  let lastPosition: number | null = null;
  let ended = false;

  return {
    ingest(positionSeconds: number) {
      if (ended || !meta.mediaId || !Number.isFinite(positionSeconds)) {
        return;
      }
      const now = Date.now();
      if (lastPosition !== null) {
        const delta = positionSeconds - lastPosition;
        const ms = delta * 1000;
        lastPosition = positionSeconds;
        if (ms <= 0 || ms > MAX_TICK_MS) {
          return;
        }
        useViewingStatsStore
          .getState()
          .recordTick({...meta, ms: Math.round(ms), isPlay: false, at: now});
        return;
      }
      lastPosition = positionSeconds;
      useViewingStatsStore
        .getState()
        .recordTick({...meta, ms: 0, isPlay: true, at: now});
    },
    end() {
      ended = true;
      lastPosition = null;
    },
  };
}

export default useViewingStatsStore;
