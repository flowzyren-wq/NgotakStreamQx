import React, {useState} from 'react';
import {Platform, Pressable, View, LayoutAnimation} from 'react-native';
import {isDynamicColorAvailable} from '@expo/ui/jetpack-compose';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import useThemeStore from '../../../lib/zustand/themeStore';
import {useM3Colors} from '../../../theme/M3PaletteContext';
import AppText from '../../../components/ui/Text';
import Surface from '../../../components/ui/Surface';
import SettingsSwitchRow from '../../../components/ui/SettingsSwitchRow';
import {settingsStorage} from '../../../lib/storage';

const AppearancePreference = () => {
  const source = useThemeStore(state => state.source);
  const setSource = useThemeStore(state => state.setSource);
  const setActiveProfile = useThemeStore(state => state.setActiveProfile);
  const activeProfileId = useThemeStore(state => state.activeProfileId);
  const isPureBlack = useThemeStore(state => state.isPureBlack);
  const setPureBlack = useThemeStore(state => state.setPureBlack);
  const useLinoteeFont = useThemeStore(state => state.useLinoteeFont);
  const setUseLinoteeFont = useThemeStore(state => state.setUseLinoteeFont);
  const colors = useM3Colors();
  const [dynamicInfoAccentEnabled, setDynamicInfoAccentEnabled] = useState(() =>
    settingsStorage.isDynamicInfoAccentEnabled(),
  );

  const wallpaperActive = source === 'wallpaper' && !activeProfileId;

  return (
    <View style={{ gap: 24, paddingBottom: 20 }}>
      {/* Color Engine Card */}
      <View>
        <AppText role="titleMedium" style={{ color: colors.primary, fontWeight: 'bold', marginBottom: 12, marginLeft: 8 }}>
          Color Engine
        </AppText>
        <Surface level="low" className="overflow-hidden">
          <Pressable
            testID="accent-source-wallpaper"
            disabled={!isDynamicColorAvailable}
            onPress={() => {
               LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
               setActiveProfile(null);
               setSource('wallpaper');
            }}
            className="flex-row items-center p-5"
            style={({pressed}) => ({
              backgroundColor: pressed
                ? colors.surfaceContainerHighest
                : 'transparent',
            })}>
            <View
              className="mr-5 h-12 w-12 items-center justify-center rounded-full"
              style={{backgroundColor: wallpaperActive ? colors.primaryContainer : colors.surfaceContainerHighest}}>
              <MaterialCommunityIcons
                name="wallpaper"
                size={24}
                color={wallpaperActive ? colors.onPrimaryContainer : colors.onSurfaceVariant}
              />
            </View>
            <View className="mr-4 flex-1 shrink">
              <AppText
                role="titleMedium"
                numberOfLines={1}
                style={{ color: wallpaperActive ? colors.primary : colors.onSurface, fontWeight: wallpaperActive ? 'bold' : '600' }}>
                Dynamic Material You
              </AppText>
              <AppText
                role="bodyMedium"
                numberOfLines={2}
                style={{ marginTop: 4, color: colors.onSurfaceVariant }}>
                {isDynamicColorAvailable
                  ? 'Extract colors from your wallpaper'
                  : 'Requires Android 12 or newer'}
              </AppText>
            </View>
            {wallpaperActive && isDynamicColorAvailable ? (
              <MaterialCommunityIcons
                name="check-circle"
                size={26}
                color={colors.primary}
              />
            ) : null}
          </Pressable>
        </Surface>
      </View>

      {/* Visual Experience Card */}
      <View>
        <AppText role="titleMedium" style={{ color: colors.primary, fontWeight: 'bold', marginBottom: 12, marginLeft: 8 }}>
          Visual Experience
        </AppText>
        <Surface level="low" className="overflow-hidden">
          <SettingsSwitchRow
            title="Dynamic Info Accent"
            description="Adapt UI accent strictly to movie poster artwork"
            value={dynamicInfoAccentEnabled}
            onValueChange={enabled => {
              setDynamicInfoAccentEnabled(enabled);
              settingsStorage.setDynamicInfoAccentEnabled(enabled);
            }}
          />
          <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginHorizontal: 20, opacity: 0.5 }} />
          <SettingsSwitchRow
            title="AMOLED Pure Black"
            description="Force deep black background to save battery"
            value={isPureBlack}
            onValueChange={enabled => {
              setPureBlack(enabled);
            }}
          />
        </Surface>
      </View>

      {/* Typography Card */}
      <View>
        <AppText role="titleMedium" style={{ color: colors.primary, fontWeight: 'bold', marginBottom: 12, marginLeft: 8 }}>
          Typography
        </AppText>
        <Surface level="low" className="overflow-hidden">
          <SettingsSwitchRow
            title="Use System Default Font"
            description="Switch back to the standard native Inter font"
            value={!useLinoteeFont}
            onValueChange={enabled => {
              setUseLinoteeFont(!enabled);
            }}
          />
        </Surface>
      </View>
    </View>
  );
};

export default AppearancePreference;
