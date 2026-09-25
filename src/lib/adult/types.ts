// Types for the adult section. The original type declarations are not present
// in the compiled bundle; these are inferred from how the data is used.

export type AdultSiteKind = 'hlsCards' | string;

export interface AdultSite {
  id: string;
  name: string;
  home: string;
  search: string;
  feed?: string;
  cardRe: string;
  detailIdRe?: string;
  kind?: AdultSiteKind;
  headers?: Record<string, string>;
}

export interface AdultRegistry {
  version?: number | string;
  sites: AdultSite[];
}

export interface AdultCard {
  siteId: string;
  siteName: string;
  url: string;
  title: string;
  thumb?: string;
}

export interface AdultFeedSection {
  siteId: string;
  siteName: string;
  cards: AdultCard[];
}

export interface AdultStream {
  url: string;
  type: 'm3u8' | 'mp4';
  server: string;
  height?: number;
  headers?: Record<string, string>;
}
