import {describe, expect, it} from '@jest/globals';
import {
  createDirectDownloadId,
  createDownloadFileName,
  createSeriesDownloadId,
  createSubtitleFileName,
  sanitizeDownloadFileName,
} from '../src/lib/downloadId';

describe('download identity and filenames', () => {
  it('matches desktop download IDs', () => {
    expect(createSeriesDownloadId('Show', 'Season 1', 0)).toBe(
      'Show_SSeason 1_E1',
    );
    expect(createDirectDownloadId('Movie', 'Default', 2)).toBe(
      'Movie_SDefault_E3',
    );
  });

  it('keeps identity separate from safe physical filenames', () => {
    const id = createSeriesDownloadId('Pokémon', 'Season 1', 0);
    expect(id).toBe('Pokémon_SSeason 1_E1');
    expect(createDownloadFileName(id)).toBe('Pokemon_SSeason_1_E1');
    expect(sanitizeDownloadFileName('Épisode 1: A/B?')).toBe('Episode_1_A_B');
  });

  it('sanitizes subtitle names', () => {
    expect(createSubtitleFileName('Movie Name', 'English / Signs')).toBe(
      'Movie_Name-English_Signs',
    );
    expect(sanitizeDownloadFileName('***')).toBe('download');
  });
});
