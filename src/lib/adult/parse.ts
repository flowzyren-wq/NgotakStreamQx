import type {AdultCard, AdultSite} from './types';

const DEFAULT_MP4_EXCLUDE =
  /thumb|preview_|sprite|banner|trailer|\.jpe?g|\.png|\.webp/i;
const IMAGE_RE = /(https?:\/\/[^\s"'<>]+?\.(?:jpe?g|png|webp)(?:\?[^\s"'<>]*)?)/i;

export function decodeJsonSlashes(value: string): string {
  return value.replace(/\\\//g, '/').replace(/\\u002F/gi, '/');
}

export function slugToTitle(url: string): string {
  try {
    const parts = url.split('?')[0].split('#')[0].split('/').filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return url;
  }
}

export function ogMeta(html: string, property: string): string | null {
  const re = new RegExp(
    `${property.replace(':', ':\\s*')}[^>]*?content="([^"]+)"|` +
      `<meta[^>]+property="${property}"[^>]+content="([^"]+)"`,
    'i',
  );
  const match = html.match(re);
  const value = match && (match[1] || match[2]);
  return value ? decodeJsonSlashes(value) : null;
}

export function extractMasters(html: string): string[] {
  const text = decodeJsonSlashes(html);
  const re = /https?:\/\/[^\s"'<>]+?\.m3u8[^\s"'<>]*/gi;
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const url = match[0].replace(/[),;]+$/, '');
    if (!urls.includes(url)) {
      urls.push(url);
    }
  }
  return urls;
}

export function parseHeight(url: string): number | null {
  const text = decodeJsonSlashes(url);
  for (const re of [
    /[_/](\d{3,4})p?\.mp4/i,
    /\/(\d{3,4})P_\d+K_/i,
    /_(\d{3,4})p_(?=\.mp4|\/)/i,
  ]) {
    const match = text.match(re);
    if (match) {
      const height = parseInt(match[1], 10);
      if (height >= 240 && height <= 2160) {
        return height;
      }
    }
  }
  return null;
}

export function extractMp4(
  html: string,
  options?: {exclude?: RegExp | null; include?: RegExp},
): string[] {
  const text = decodeJsonSlashes(html);
  const exclude =
    options?.exclude !== undefined ? options.exclude : DEFAULT_MP4_EXCLUDE;
  const re = /https?:\/\/[^\s"'<>\\]+?\.mp4(?:\/?\?[^\s"'<>\\]*)?/gi;
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const url = match[0].replace(/[),;]+$/, '');
    if (exclude && exclude.test(url)) {
      continue;
    }
    if (options?.include && !options.include.test(url)) {
      continue;
    }
    if (!urls.includes(url)) {
      urls.push(url);
    }
  }
  return urls;
}

export function collectCards(
  html: string,
  pattern: string,
  site: AdultSite,
  limit: number = 30,
): AdultCard[] {
  try {
    const re = new RegExp(pattern, 'g');
    const cards: AdultCard[] = [];
    const seen = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const href = match[1];
      if (!href) {
        continue;
      }
      const url = /^https?:\/\//i.test(href)
        ? href
        : site.home.replace(/\/+$/, '') + '/' + href.replace(/^\/+/, '');
      if (seen.has(url)) {
        continue;
      }
      seen.add(url);
      const image = html
        .slice(match.index, match.index + 1100)
        .match(IMAGE_RE);
      const thumb = image ? decodeJsonSlashes(image[1]) : undefined;
      cards.push({
        siteId: site.id,
        siteName: site.name,
        url,
        title: (match[2] && match[2].trim()) || slugToTitle(url),
        thumb,
      });
      if (cards.length >= limit) {
        break;
      }
    }
    return cards;
  } catch {
    return [];
  }
}
