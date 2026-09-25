import {AnimatedAppText} from '../../components/ui/Text';
import {
  DevSettings,
  ToastAndroid,
  View,
  Pressable,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import {
  settingsStorage,
  clearAllMMKVStorage,
} from '../../lib/storage';
import Constants from 'expo-constants';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SettingsStackParamList} from '../../App';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  interpolateColor,
} from 'react-native-reanimated';
import useNavigationPreferencesStore from '../../lib/zustand/navigationPreferencesStore';
import useContentStore from '../../lib/zustand/contentStore';
import DnsPreference from './components/DnsPreference';
import IconButton from '../../components/ui/IconButton';
import SettingsRow from '../../components/ui/SettingsRow';
import SettingsSection from '../../components/ui/SettingsSection';
import AppText from '../../components/ui/Text';
import {useM3Colors} from '../../theme/M3PaletteContext';
import {showAppDialog} from '../../lib/zustand/appDialogStore';
import {MMKV} from '../../lib/Mmkv';
import {clearAppCache} from '../../lib/clearAppCache';
import * as RNFS from '@dr.pogodin/react-native-fs';
import useContinueWatchingStore from '../../lib/zustand/continueWatchingStore';
import SquareSettingsCard from '../../components/ui/SquareSettingsCard';
import AmbientBackground from '../../components/ui/AmbientBackground';

type Props = NativeStackScreenProps<SettingsStackParamList, 'Settings'>;

const Settings = ({navigation}: Props) => {
  const colors = useM3Colors();
  const hideDownloadsTab = useNavigationPreferencesStore(
    state => state.hideDownloadsTab,
  );
  const provider = useContentStore(state => state.provider);
  const providerName =
    provider?.display_name || provider?.value || 'NgotakStream Qx';

  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerTextStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [30, 60], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(scrollY.value, [30, 60], [10, 0], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const headerContainerStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        scrollY.value,
        [30, 60],
        ['transparent', '#000000'],
      ),
    };
  });

  const [cacheSize, setCacheSize] = useState<string | null>(null);
  const [networkRetries, setNetworkRetries] = useState(
    settingsStorage.getNetworkRetryCount(),
  );

  const refreshCacheSize = useCallback(async () => {
    try {
      const files = await RNFS.readDir(RNFS.CachesDirectoryPath);
      const bytes = files.reduce(
        (total, file) => total + (file.isFile() ? file.size : 0),
        0,
      );
      if (bytes >= 1024 * 1024 * 1024) {
        setCacheSize(`${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`);
      } else if (bytes >= 1024 * 1024) {
        setCacheSize(`${(bytes / (1024 * 1024)).toFixed(1)} MB`);
      } else {
        setCacheSize(`${Math.max(0, Math.round(bytes / 1024))} KB`);
      }
    } catch {
      setCacheSize(null);
    }
  }, []);

  useEffect(() => {
    refreshCacheSize();
  }, [refreshCacheSize]);

  const clearCacheHandler = useCallback(async () => {
    if (settingsStorage.isHapticFeedbackEnabled()) {
      ReactNativeHapticFeedback.trigger('virtualKey', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }
    await clearAppCache();
    refreshCacheSize();
    ToastAndroid.show('App cache cleared', ToastAndroid.SHORT);
  }, [refreshCacheSize]);

  const confirmClearWatchHistory = useCallback(() => {
    showAppDialog({
      title: 'Clear watch history?',
      message:
        'Removes every Continue watching entry. Watchlist items and downloaded files are not affected.',
      actions: [
        {label: 'Cancel'},
        {
          label: 'Clear history',
          variant: 'destructive',
          onPress: () => {
            useContinueWatchingStore.getState().clearAllItems();
            ToastAndroid.show('Watch history cleared', ToastAndroid.SHORT);
          },
        },
      ],
    });
  }, []);

  const confirmClearSearchHistory = useCallback(() => {
    showAppDialog({
      title: 'Clear search history?',
      message:
        'Removes recent searches shown on the Search screen. This cannot be undone.',
      actions: [
        {label: 'Cancel'},
        {
          label: 'Clear history',
          variant: 'destructive',
          onPress: () => {
            MMKV.setArray('searchHistory', []);
            ToastAndroid.show('Search history cleared', ToastAndroid.SHORT);
          },
        },
      ],
    });
  }, []);

  const eraseAllLocalData = useCallback(async () => {
    clearAllMMKVStorage();
    DevSettings.reload('All MMKV storage erased');
  }, []);

  const confirmEraseAllLocalData = useCallback(() => {
    showAppDialog({
      title: 'Erase all local data?',
      message:
        'This permanently erases every NgotakStream Qx MMKV store, including settings, installed provider data, Watchlist, Continue watching, download records, and cached state. This cannot be undone. Downloaded media files on disk are not deleted.',
      variant: 'error',
      actions: [
        {label: 'Cancel'},
        {
          label: 'Erase everything',
          variant: 'destructive',
          onPress: eraseAllLocalData,
        },
      ],
    });
  }, [eraseAllLocalData]);

  const AnimatedSection = ({
    delay,
    children,
  }: {
    delay: number;
    children: React.ReactNode;
  }) => (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      layout={Layout.springify()}>
      {children}
    </Animated.View>
  );

  const chipStyle = {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  };
  const chipTextStyle = {color: '#ffffff', fontSize: 12, fontWeight: '600' as const};

  return (
    <AmbientBackground>
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

        {/* Sticky Top Header Bar */}
      <Animated.View
        style={[{
          position: 'absolute', top: 0, left: 0, right: 0,
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 5 : 45,
          paddingBottom: 15,
          zIndex: 10,
        }, headerContainerStyle]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => navigation.goBack()} style={({pressed}) => ({ opacity: pressed ? 0.7 : 1, padding: 4, marginLeft: -4 })}>
            <Ionicons name="arrow-back" size={28} color="#ffffff" />
          </Pressable>
          <AnimatedAppText style={[{ color: '#ffffff', fontSize: 20, marginLeft: 20 }, headerTextStyle]}>
            Settings
          </AnimatedAppText>
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        className="h-full w-full"
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="always"
        entering={FadeInUp.springify()}
        layout={Layout.springify()}
        contentContainerStyle={{
          paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 85 : 120, // Push content down below the sticky bar
          paddingBottom: 120,
          flexGrow: 1,
        }}>

        {/* Large Scrolling Header */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24, marginTop: 10 }}>
          <AppText role="headlineLarge" style={{ color: '#ffffff', fontSize: 34 }}>
            Settings
          </AppText>
        </View>

        <View className="px-5">
          {/* App Header Card (opens About) */}
          <AnimatedSection delay={50}>
            <Pressable
              onPress={() => {
                if (settingsStorage.isHapticFeedbackEnabled()) {
                  ReactNativeHapticFeedback.trigger('impactLight', {
                    enableVibrateFallback: true,
                    ignoreAndroidSystemSettings: false,
                  });
                }
                navigation.navigate('About');
              }}
              style={({pressed}) => ({
                opacity: pressed ? 0.92 : 1,
                transform: [{scale: pressed ? 0.985 : 1}],
                marginBottom: 24,
              })}>
              <View
                style={{
                  backgroundColor: colors.surfaceContainer,
                  borderRadius: 24,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.06)',
                }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                  <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 14,
                      }}>
                      <Image
                        source={require('../../../assets/icon_transparent.png')}
                        style={{width: 50, height: 50}}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={{flex: 1, justifyContent: 'center'}}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <AppText
                          role="titleLarge"
                          style={{
                            color: '#ffffff',
                            fontSize: 20,
                            fontWeight: '700',
                            letterSpacing: 0.2,
                          }}>
                          NgotakStream Qx
                        </AppText>
                        <View
                          style={{
                            marginLeft: 8,
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: 'rgba(16, 185, 129, 0.3)',
                          }}>
                          <AppText
                            style={{
                              color: '#34D399',
                              fontSize: 10,
                              fontWeight: '700',
                              letterSpacing: 0.5,
                              textTransform: 'uppercase',
                            }}>
                            Active
                          </AppText>
                        </View>
                      </View>
                      <AppText
                        style={{
                          color: colors.onSurfaceVariant,
                          fontSize: 12,
                          marginTop: 4,
                          lineHeight: 16,
                        }}>
                        Cinematic streaming, engineered clean
                      </AppText>
                    </View>
                  </View>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#2e3036',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 10,
                    }}>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="rgba(255, 255, 255, 0.7)"
                    />
                  </View>
                </View>

                <View
                  style={{
                    height: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    marginTop: 18,
                    marginBottom: 16,
                  }}
                />

                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <View style={chipStyle}>
                    <MaterialIcons
                      name="verified"
                      size={13}
                      color={colors.primary}
                      style={{marginRight: 5}}
                    />
                    <AppText style={chipTextStyle}>
                      v{Constants.expoConfig?.version || '1.0.2'}
                    </AppText>
                  </View>
                  <View style={chipStyle}>
                    <MaterialCommunityIcons
                      name="cpu-64-bit"
                      size={14}
                      color="#60A5FA"
                      style={{marginRight: 5}}
                    />
                    <AppText style={chipTextStyle}>ARM64</AppText>
                  </View>
                  <View style={chipStyle}>
                    <MaterialCommunityIcons
                      name="puzzle"
                      size={13}
                      color="#FBBF24"
                      style={{marginRight: 5}}
                    />
                    <AppText numberOfLines={1} style={chipTextStyle}>
                      {providerName}
                    </AppText>
                  </View>
                </View>
              </View>
            </Pressable>
          </AnimatedSection>

          {/* 2x2 Grid */}
          <AnimatedSection delay={100}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <SquareSettingsCard
                title="Provider Manager"
                icon="puzzle-outline"
                onPress={() => navigation.navigate('Extensions')}
              />
              <SquareSettingsCard
                title="Appearance"
                icon="palette-outline"
                onPress={() => navigation.navigate('Appearance')}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              <SquareSettingsCard
                title="Subtitle Style"
                icon="subtitles-outline"
                onPress={() => navigation.navigate('SubTitlesPreferences')}
              />
              <SquareSettingsCard
                title="Preferences"
                icon="tune-variant"
                onPress={() => navigation.navigate('Preferences')}
              />
            </View>
          </AnimatedSection>

          {/* Network Section */}
          <AnimatedSection delay={200}>
            <SettingsSection title="Network">
              <DnsPreference />
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.outlineVariant,
                  marginHorizontal: 16,
                  opacity: 0.5,
                }}
              />
              <View style={{padding: 16}}>
                <AppText
                  role="titleSmall"
                  style={{color: colors.onSurface, fontWeight: '600'}}>
                  Network retries
                </AppText>
                <AppText
                  role="bodySmall"
                  style={{
                    color: colors.onSurfaceVariant,
                    marginTop: 2,
                    marginBottom: 10,
                  }}>
                  How many times failed requests are retried (4xx and cancelled requests are never retried)
                </AppText>
                <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
                  {[
                    {value: 0, label: 'Off'},
                    {value: 1, label: '1'},
                    {value: 3, label: '3'},
                    {value: 5, label: '5'},
                  ].map(option => {
                    const selected = networkRetries === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        onPress={() => {
                          setNetworkRetries(option.value);
                          settingsStorage.setNetworkRetryCount(option.value);
                        }}
                        style={{
                          backgroundColor: selected
                            ? colors.secondaryContainer
                            : colors.surfaceContainerHigh,
                          borderColor: selected
                            ? colors.primary
                            : colors.outlineVariant,
                          borderRadius: 14,
                          borderWidth: 1,
                          minWidth: 56,
                          alignItems: 'center',
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                        }}>
                        <AppText
                          role="labelLargeEmphasized"
                          style={{
                            color: selected
                              ? colors.onSecondaryContainer
                              : colors.onSurface,
                          }}>
                          {option.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </SettingsSection>
          </AnimatedSection>

          {/* Options Section */}
          <AnimatedSection delay={250}>
            {hideDownloadsTab && (
              <SettingsSection title="Downloads">
                <SettingsRow
                  title="Downloads"
                  icon="download-circle-outline"
                  divider={false}
                  onPress={() => navigation.navigate('DownloadsStack')}
                />
              </SettingsSection>
            )}
          </AnimatedSection>

          {/* Data Management section */}
          <AnimatedSection delay={300}>
            <SettingsSection title="Data Management">
              <SettingsRow
                title="Clear Cache"
                description={
                  cacheSize
                    ? `Cached files: ${cacheSize}`
                    : 'Cached thumbnails, artwork & responses'
                }
                trailing={
                  <IconButton
                    icon="delete-outline"
                    label="Clear cache"
                    onPress={clearCacheHandler}
                  />
                }
              />
              <SettingsRow
                title="Clear watch history"
                description="Remove all Continue watching entries"
                icon="history"
                onPress={confirmClearWatchHistory}
              />
              <SettingsRow
                title="Clear search history"
                description="Remove recent searches from the Search screen"
                icon="magnify-close"
                onPress={confirmClearSearchHistory}
              />
              <SettingsRow
                title="Erase all local data"
                description="Erase all local data"
                icon="delete-alert-outline"
                divider={false}
                onPress={confirmEraseAllLocalData}
              />
            </SettingsSection>
          </AnimatedSection>
        </View>
      </Animated.ScrollView>
    </View>
    </AmbientBackground>
  );
};

export default Settings;
