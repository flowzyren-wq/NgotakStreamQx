import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {MMKVLoader} from 'react-native-mmkv-storage';
import {settingsStorage} from '../storage';
import {DEFAULT_SEED} from '../../theme/seeds';
import {
  createThemeId,
  ThemeProfile,
  ThemeProfileDraft,
} from '../../theme/themeProfiles';

const storage = new MMKVLoader().initialize();

export type AccentSource = 'wallpaper' | 'custom';

export type SaveProfileOptions = {
  /** Existing profile id to update; a new profile is created when omitted. */
  id?: string;
  /** Apply the saved profile immediately (default: true). */
  activate?: boolean;
};

export interface Theme {
  primary: string;
  isCustom: boolean;
  /** Where the Material 3 palette comes from: the device wallpaper or a custom seed. */
  source: AccentSource;
  isPureBlack: boolean;
  useLinoteeFont: boolean;
  profiles: ThemeProfile[];
  activeProfileId: string | null;
  /** Unsaved draft shown live while editing a theme profile. */
  previewProfile: ThemeProfileDraft | null;
  setPrimary: (type: Theme['primary']) => void;
  setCustom: (isCustom: boolean) => void;
  setSource: (source: AccentSource) => void;
  setPureBlack: (isPureBlack: boolean) => void;
  setUseLinoteeFont: (enabled: boolean) => void;
  setActiveProfile: (id: string | null) => void;
  saveProfile: (
    draft: ThemeProfileDraft,
    options?: SaveProfileOptions,
  ) => ThemeProfile;
  deleteProfile: (id: string) => void;
  setPreviewProfile: (draft: ThemeProfileDraft | null) => void;
  resetToDefaultTheme: () => void;
}

const useThemeStore = create<Theme>()(
  persist(
    set => ({
      primary: settingsStorage.getPrimaryColor(),
      isCustom: settingsStorage.isCustomTheme(),
      source: settingsStorage.getAccentSource(),
      isPureBlack: settingsStorage.isPureBlackBackgroundEnabled(),
      useLinoteeFont: settingsStorage.isLinoteeFontEnabled(),
      profiles: settingsStorage.getThemeProfiles(),
      activeProfileId: settingsStorage.getActiveThemeProfileId(),
      previewProfile: null,

      setPrimary: (primary: Theme['primary']) => {
        set({primary});
        settingsStorage.setPrimaryColor(primary);
      },
      setCustom: (isCustom: Theme['isCustom']) => {
        set({isCustom});
        settingsStorage.setCustomTheme(isCustom);
      },
      setSource: (source: AccentSource) => {
        set({source});
        settingsStorage.setAccentSource(source);
      },
      setPureBlack: (isPureBlack: boolean) => {
        set({isPureBlack});
        settingsStorage.setPureBlackBackgroundEnabled(isPureBlack);
      },
      setUseLinoteeFont: (useLinoteeFont: boolean) => {
        set({useLinoteeFont});
        settingsStorage.setLinoteeFontEnabled(useLinoteeFont);
      },
      setActiveProfile: (id: string | null) => {
        settingsStorage.setActiveThemeProfileId(id);
        if (id) {
          const profile = settingsStorage
            .getThemeProfiles()
            .find(item => item.id === id);
          if (profile) {
            settingsStorage.setPrimaryColor(profile.primary);
            settingsStorage.setAccentSource('custom');
          }
        }
        set({activeProfileId: id});
      },
      saveProfile: (draft, options = {}) => {
        const now = Date.now();
        const existing = options.id
          ? settingsStorage
              .getThemeProfiles()
              .find(item => item.id === options.id)
          : undefined;
        const profile: ThemeProfile = {
          ...draft,
          id: existing?.id ?? createThemeId(),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        const current = settingsStorage.getThemeProfiles();
        const profiles = existing
          ? current.map(item => (item.id === profile.id ? profile : item))
          : [...current, profile];
        settingsStorage.setThemeProfiles(profiles);

        const activate = options.activate ?? true;
        if (activate) {
          settingsStorage.setActiveThemeProfileId(profile.id);
          settingsStorage.setPrimaryColor(profile.primary);
          settingsStorage.setAccentSource('custom');
        }
        set({
          profiles,
          ...(activate ? {activeProfileId: profile.id} : {}),
        });
        return profile;
      },
      deleteProfile: (id: string) => {
        const profiles = settingsStorage
          .getThemeProfiles()
          .filter(item => item.id !== id);
        settingsStorage.setThemeProfiles(profiles);
        const wasActive = settingsStorage.getActiveThemeProfileId() === id;
        if (wasActive) {
          settingsStorage.setActiveThemeProfileId(null);
        }
        set({
          profiles,
          ...(wasActive ? {activeProfileId: null} : {}),
        });
      },
      setPreviewProfile: (previewProfile: ThemeProfileDraft | null) =>
        set({previewProfile}),
      resetToDefaultTheme: () => {
        settingsStorage.setActiveThemeProfileId(null);
        settingsStorage.setAccentSource('custom');
        settingsStorage.setPrimaryColor(DEFAULT_SEED);
        set({
          activeProfileId: null,
          previewProfile: null,
          primary: DEFAULT_SEED,
          isCustom: true,
          source: 'custom',
        });
      },
    }),
    {
      name: 'theme-storage',
      //@ts-expect-error
      storage: createJSONStorage(() => storage),
      partialize: state => ({
        primary: state.primary,
        isCustom: state.isCustom,
        source: state.source,
        isPureBlack: state.isPureBlack,
        useLinoteeFont: state.useLinoteeFont,
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
      }),
    },
  ),
);

export default useThemeStore;
