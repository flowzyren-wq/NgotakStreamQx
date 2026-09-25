import {loadAdultRegistry} from './registry';
import {fetchSiteFeed, resolveSiteStreams, searchSite} from './scraper';
import type {AdultCard, AdultFeedSection, AdultStream} from './types';

export {resetRegistryCache} from './registry';

export async function searchAdult(query: string): Promise<AdultCard[]> {
  const registry = loadAdultRegistry();
  if (!registry || !query.trim()) {
    return [];
  }
  const results = await Promise.all(
    registry.sites.map(site => searchSite(site, query.trim())),
  );
  return results.flat();
}

export async function getAdultFeed(): Promise<AdultFeedSection[]> {
  const registry = loadAdultRegistry();
  if (!registry) {
    return [];
  }
  const sections = await Promise.all(
    registry.sites
      .filter(site => !!site.feed)
      .map(async site => ({
        siteId: site.id,
        siteName: site.name,
        cards: await fetchSiteFeed(site),
      })),
  );
  return sections.filter(section => section.cards.length > 0);
}

export async function resolveAdultStreams(
  card: AdultCard,
): Promise<AdultStream[]> {
  const site = loadAdultRegistry()?.sites.find(s => s.id === card.siteId);
  if (!site) {
    return [];
  }
  return resolveSiteStreams(site, card.url);
}
