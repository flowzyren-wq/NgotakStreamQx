export type StatsRangeKey = 'week' | 'month' | 'quarter' | 'half' | 'all';

export interface StatsRange {
  key: StatsRangeKey;
  label: string;
  days: number | null;
}

export interface DayStat {
  ms: number;
  plays: number;
}

export interface ViewingTitleStats {
  id: string;
  title: string;
  poster?: string;
  infoUrl?: string;
  providerValue?: string;
  type?: string;
  days: Record<string, DayStat>;
  totalMs: number;
  totalPlays: number;
  lastWatchedAt: number;
}

export interface TitleRangeStats {
  id: string;
  title: string;
  poster?: string;
  infoUrl?: string;
  providerValue?: string;
  ms: number;
  plays: number;
  share: number;
}

export interface StatsSegment {
  label: string;
  ms: number;
  share: number;
  color: string;
  isOther: boolean;
}

export interface RangeStats {
  totalMs: number;
  plays: number;
  uniqueTitles: number;
  activeDays: number;
  byTitle: TitleRangeStats[];
  segments: StatsSegment[];
  favorite: TitleRangeStats | null;
  mostReplayed: TitleRangeStats | null;
}

export const STATS_RANGES: StatsRange[] = [
  {key: 'week', label: '1 week', days: 7},
  {key: 'month', label: '1 month', days: 30},
  {key: 'quarter', label: '3 months', days: 90},
  {key: 'half', label: '6 months', days: 180},
  {key: 'all', label: 'All', days: null},
];

export const DONUT_COLORS = [
  '#FF6B8A',
  '#FFD166',
  '#4CC9F0',
  '#9BE3B5',
  '#B388FF',
];

const OTHER_COLOR = '#6B6B70';
const DAY_MS = 86400000;

export function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function rangeStartKey(key: StatsRangeKey, now: number): string {
  const range = STATS_RANGES.find(item => item.key === key);
  if (!range || range.days === null) {
    return '0000-00-00';
  }
  return dayKey(now - range.days * DAY_MS);
}

export function formatWatchDuration(ms: number, withSeconds = false): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (withSeconds) {
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  if (totalSeconds > 0) {
    return '<1m';
  }
  return '0m';
}

export const EMPTY_RANGE_STATS: RangeStats = {
  totalMs: 0,
  plays: 0,
  uniqueTitles: 0,
  activeDays: 0,
  byTitle: [],
  segments: [],
  favorite: null,
  mostReplayed: null,
};

export function computeRangeStats(
  titles: Record<string, ViewingTitleStats>,
  rangeKey: StatsRangeKey,
  now: number = Date.now(),
): RangeStats {
  const startKey = rangeStartKey(rangeKey, now);
  const activeDays = new Set<string>();
  const byTitle: TitleRangeStats[] = [];
  let totalMs = 0;
  let totalPlays = 0;

  for (const entry of Object.values(titles)) {
    let ms = 0;
    let plays = 0;
    for (const [key, stat] of Object.entries(entry.days)) {
      if (key < startKey) {
        continue;
      }
      ms += stat.ms;
      plays += stat.plays;
      if (stat.ms > 0) {
        activeDays.add(key);
      }
    }
    totalPlays += plays;
    if (ms <= 0) {
      continue;
    }
    totalMs += ms;
    byTitle.push({
      id: entry.id,
      title: entry.title,
      poster: entry.poster,
      infoUrl: entry.infoUrl,
      providerValue: entry.providerValue,
      ms,
      plays,
      share: 0,
    });
  }

  byTitle.sort((a, b) => b.ms - a.ms || b.plays - a.plays);
  if (totalMs > 0) {
    for (const item of byTitle) {
      item.share = item.ms / totalMs;
    }
  }

  const top = byTitle.slice(0, 5);
  const rest = byTitle.slice(5);
  const segments: StatsSegment[] = top.map((item, index) => ({
    label: item.title,
    ms: item.ms,
    share: totalMs > 0 ? item.ms / totalMs : 0,
    color: DONUT_COLORS[index % DONUT_COLORS.length],
    isOther: false,
  }));
  if (rest.length > 0) {
    const otherMs = rest.reduce((sum, item) => sum + item.ms, 0);
    segments.push({
      label: 'Other',
      ms: otherMs,
      share: totalMs > 0 ? otherMs / totalMs : 0,
      color: OTHER_COLOR,
      isOther: true,
    });
  }

  const favorite = byTitle.find(item => item.ms > 0) ?? null;
  const mostReplayed =
    [...byTitle].sort((a, b) => b.plays - a.plays)[0] ?? null;

  return {
    totalMs,
    plays: totalPlays,
    uniqueTitles: byTitle.length,
    activeDays: activeDays.size,
    byTitle,
    segments,
    favorite,
    mostReplayed,
  };
}
