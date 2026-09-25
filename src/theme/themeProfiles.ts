import type {MaterialColors} from './colors';
import {mixHex, readableOnColor} from './seeds';

/** Colour fields a user can edit in a theme profile. */
export type ThemeColorKey =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'background'
  | 'surface'
  | 'text';

export type ThemeProfileDraft = {name: string} & Record<ThemeColorKey, string>;

export type ThemeProfile = ThemeProfileDraft & {
  id: string;
  createdAt: number;
  updatedAt: number;
};

export const DEFAULT_THEME_PROFILE_DRAFT: ThemeProfileDraft = {
  name: 'Signature',
  primary: '#FFFFFF',
  secondary: '#97979A',
  accent: '#E4E4E4',
  background: '#000000',
  surface: '#171717',
  text: '#F2F2F2',
};

export const THEME_COLOR_KEYS: ThemeColorKey[] = [
  'primary',
  'secondary',
  'accent',
  'background',
  'surface',
  'text',
];

const ON_FIXED = '#17100F';

export const createThemeId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Normalises `#RGB`, `RGB`, `#RRGGBB` or `RRGGBB` into upper-case `#RRGGBB`; returns null when invalid. */
export const normalizeHexColor = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(char => char + char)
      .join('');
  }
  return `#${hex.toUpperCase()}`;
};

/** Expands the six user colours of a profile into a full Material 3 colour scheme. */
export const createPaletteFromProfile = (
  profile: ThemeProfileDraft,
): MaterialColors => {
  const primary = profile.primary.toUpperCase();
  const secondary = profile.secondary.toUpperCase();
  const accent = profile.accent.toUpperCase();
  const background = profile.background.toUpperCase();
  const surface = profile.surface.toUpperCase();
  const text = profile.text.toUpperCase();

  const primaryContainer = mixHex(primary, background, 0.48);
  const secondaryContainer = mixHex(secondary, background, 0.56);
  const tertiaryContainer = mixHex(accent, background, 0.64);
  const primaryFixed = mixHex(primary, '#FFFFFF', 0.76);
  const primaryFixedDim = mixHex(primary, '#FFFFFF', 0.48);
  const outline = mixHex(text, surface, 0.55);
  const outlineVariant = mixHex(text, surface, 0.8);
  const inverseSurface = mixHex(text, background, 0.12);
  const inverseOnSurface = mixHex(background, text, 0.18);

  return {
    primary,
    onPrimary: readableOnColor(primary),
    primaryContainer,
    onPrimaryContainer: mixHex(primary, '#FFFFFF', 0.82),
    inversePrimary: mixHex(primary, background, 0.3),
    secondary,
    onSecondary: readableOnColor(secondary),
    secondaryContainer,
    onSecondaryContainer: mixHex(secondary, '#FFFFFF', 0.84),
    tertiary: accent,
    onTertiary: readableOnColor(accent),
    tertiaryContainer,
    onTertiaryContainer: mixHex(accent, '#FFFFFF', 0.86),
    background,
    onBackground: text,
    surface,
    onSurface: text,
    surfaceVariant: mixHex(surface, text, 0.1),
    onSurfaceVariant: mixHex(text, surface, 0.3),
    surfaceTint: primary,
    inverseSurface,
    inverseOnSurface,
    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',
    onErrorContainer: '#FFDAD6',
    outline,
    outlineVariant,
    scrim: '#000000',
    surfaceBright: mixHex(surface, text, 0.18),
    surfaceDim: mixHex(surface, background, 0.35),
    surfaceContainer: mixHex(surface, background, 0.1),
    surfaceContainerHigh: mixHex(surface, text, 0.08),
    surfaceContainerHighest: mixHex(surface, text, 0.14),
    surfaceContainerLow: mixHex(surface, background, 0.4),
    surfaceContainerLowest: mixHex(surface, background, 0.7),
    primaryFixed,
    primaryFixedDim,
    onPrimaryFixed: ON_FIXED,
    onPrimaryFixedVariant: mixHex(primary, '#000000', 0.55),
    secondaryFixed: mixHex(secondary, '#FFFFFF', 0.76),
    secondaryFixedDim: mixHex(secondary, '#FFFFFF', 0.48),
    onSecondaryFixed: ON_FIXED,
    onSecondaryFixedVariant: mixHex(secondary, '#000000', 0.55),
    tertiaryFixed: mixHex(accent, '#FFFFFF', 0.76),
    tertiaryFixedDim: mixHex(accent, '#FFFFFF', 0.48),
    onTertiaryFixed: ON_FIXED,
    onTertiaryFixedVariant: mixHex(accent, '#000000', 0.55),
  } as MaterialColors;
};

export const THEME_EXPORT_FORMAT = 'ngotakstreamqx-theme';
export const THEME_EXPORT_VERSION = 1;

export const serializeThemeForExport = (profile: ThemeProfileDraft) => ({
  format: THEME_EXPORT_FORMAT,
  version: THEME_EXPORT_VERSION,
  name: profile.name,
  primary: profile.primary,
  secondary: profile.secondary,
  accent: profile.accent,
  background: profile.background,
  surface: profile.surface,
  text: profile.text,
});

const INVALID_JSON_ERROR = 'File is not valid JSON.';
const NOT_OBJECT_ERROR = 'Theme file must contain a JSON object.';

export type ThemeImportResult =
  | {ok: true; draft: ThemeProfileDraft}
  | {ok: false; error: string};

export const parseThemeImport = (text: string): ThemeImportResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {ok: false, error: INVALID_JSON_ERROR};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {ok: false, error: NOT_OBJECT_ERROR};
  }
  const data = parsed as Record<string, unknown>;
  const name = data.name;
  if (typeof name !== 'string' || !name.trim()) {
    return {ok: false, error: 'Missing or empty "name" field.'};
  }
  const draft: ThemeProfileDraft = {
    ...DEFAULT_THEME_PROFILE_DRAFT,
    name: name.trim().slice(0, 40),
  };
  for (const key of THEME_COLOR_KEYS) {
    if (key in data && data[key] !== undefined && data[key] !== null) {
      const normalized = normalizeHexColor(data[key]);
      if (!normalized) {
        return {
          ok: false,
          error: `Invalid color for "${key}": expected a hex value like "#RRGGBB".`,
        };
      }
      draft[key] = normalized;
    }
  }
  return {ok: true, draft};
};
