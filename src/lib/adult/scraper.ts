import {getHtml, joinUrl} from './http';
import {
  collectCards,
  extractMasters,
  extractMp4,
  ogMeta,
  parseHeight,
  slugToTitle,
} from './parse';
import type {AdultCard, AdultSite, AdultStream} from './types';

function toStream(url: string, site: AdultSite): AdultStream {
  const height = parseHeight(url);
  return {
    url,
    type: url.includes('.m3u8') ? 'm3u8' : 'mp4',
    server: site.name,
    ...(height === null ? {} : {height}),
    ...(site.headers ? {headers: site.headers} : {}),
  };
}

function sortStreams(streams: AdultStream[]): AdultStream[] {
  return streams
    .map((s, i) => ({s, i}))
    .sort((a, b) => {
      const ha = a.s.height ?? -1;
      const hb = b.s.height ?? -1;
      return ha === hb ? a.i - b.i : hb - ha;
    })
    .map(entry => entry.s);
}

export async function searchSite(
  site: AdultSite,
  query: string,
): Promise<AdultCard[]> {
  try {
    const path = site.search.replace('{q}', encodeURIComponent(query));
    const {status, html} = await getHtml(joinUrl(site.home, path), site.headers);
    if (status === 200 && html) {
      return collectCards(html, site.cardRe, site);
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchSiteFeed(site: AdultSite): Promise<AdultCard[]> {
  if (!site.feed) {
    return [];
  }
  try {
    const {status, html} = await getHtml(
      joinUrl(site.home, site.feed),
      site.headers,
    );
    if (status === 200 && html) {
      return collectCards(html, site.cardRe, site, 18);
    }
    return [];
  } catch {
    return [];
  }
}

export async function resolveSiteStreams(
  site: AdultSite,
  url: string,
): Promise<AdultStream[]> {
  try {
    const {status, html} = await getHtml(url, site.headers);
    if (status !== 200 || !html) {
      return [];
    }
    if (site.kind === 'hlsCards') {
      const masters = extractMasters(html);
      if (!masters.length) {
        return [];
      }
      return [toStream(masters[0], site)];
    }
    let mp4s = extractMp4(html, {
      exclude: /thumbnail|preview_|sprite|banner|trailer/i,
    });
    if (site.detailIdRe) {
      const idMatch = url.match(new RegExp(site.detailIdRe));
      if (idMatch && idMatch[1]) {
        const own = mp4s.filter(
          candidate =>
            candidate.includes(`/${idMatch[1]}/`) &&
            !/thumbnail/i.test(candidate),
        );
        if (own.length) {
          mp4s = own;
        }
      }
    }
    if (!mp4s.length) {
      const masters = extractMasters(html);
      return sortStreams(masters.slice(0, 5).map(u => toStream(u, site)));
    }
    return sortStreams(mp4s.slice(0, 5).map(u => toStream(u, site)));
  } catch {
    return [];
  }
}

export function detailTitle(html: string, url: string): string {
  return ogMeta(html, 'og:title') || slugToTitle(url);
}
