import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, {useState} from 'react';
import {Image, Pressable, StatusBar, ToastAndroid, View} from 'react-native';
import Animated, {
  Extrapolation,
  FadeInUp,
  Layout,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import type {StatsStackParamList} from '../App';
import AmbientBackground from '../components/ui/AmbientBackground';
import IconButton from '../components/ui/IconButton';
import StatsDonut from '../components/StatsDonut';
import AppText, {AnimatedAppText} from '../components/ui/Text';
import Surface from '../components/ui/Surface';
import {showAppDialog} from '../lib/zustand/appDialogStore';
import useViewingStatsStore from '../lib/zustand/viewingStatsStore';
import {
  STATS_RANGES,
  computeRangeStats,
  formatWatchDuration,
  type StatsRangeKey,
  type TitleRangeStats,
} from '../lib/utils/viewingStats';
import {useM3Colors} from '../theme/M3PaletteContext';

type Props = NativeStackScreenProps<StatsStackParamList, 'Statistics'>;

const RangeChip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => {
  const colors = useM3Colors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected}}
      onPress={onPress}
      style={{
        backgroundColor: selected ? colors.primary : colors.surfaceContainerHigh,
        borderColor: selected ? colors.primary : colors.outlineVariant,
        borderRadius: 98,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 9,
      }}>
      <AppText
        role="labelLargeEmphasized"
        style={{color: selected ? colors.onPrimary : colors.onSurface}}>
        {label}
      </AppText>
    </Pressable>
  );
};

const StatTile = ({value, label}: {value: string; label: string}) => {
  const colors = useM3Colors();
  return (
    <View style={{flex: 1, alignItems: 'center', paddingHorizontal: 4}}>
      <AppText
        role="titleLargeEmphasized"
        style={{color: colors.primary, fontSize: 26, textAlign: 'center'}}>
        {value}
      </AppText>
      <AppText
        role="labelSmall"
        style={{
          color: colors.onSurfaceVariant,
          textAlign: 'center',
          marginTop: 4,
        }}>
        {label}
      </AppText>
    </View>
  );
};

const PosterImage = ({uri}: {uri: string}) => (
  <Image
    source={{uri, cache: 'force-cache'}}
    progressiveRenderingEnabled={true}
    resizeMode="cover"
    style={{height: '100%', width: '100%'}}
  />
);

const TitleRow = ({
  rank,
  item,
  maxMs,
  onOpen,
}: {
  rank: number;
  item: TitleRangeStats;
  maxMs: number;
  onOpen: (item: TitleRangeStats) => void;
}) => {
  const colors = useM3Colors();
  const barWidth = maxMs > 0 ? Math.max(4, (item.ms / maxMs) * 100) : 0;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!item.infoUrl}
      onPress={() => onOpen(item)}
      style={({pressed}) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        opacity: pressed ? 0.75 : 1,
      })}>
      <AppText
        role="labelLarge"
        style={{color: colors.outline, width: 22, textAlign: 'center'}}>
        {rank}
      </AppText>
      <View
        style={{
          width: 42,
          height: 58,
          borderRadius: 8,
          marginHorizontal: 12,
          backgroundColor: colors.surfaceContainerHighest,
          overflow: 'hidden',
        }}>
        {item.poster ? (
          <PosterImage uri={item.poster} />
        ) : (
          <View
            style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
            <MaterialCommunityIcons
              name="filmstrip"
              size={18}
              color={colors.outline}
            />
          </View>
        )}
      </View>
      <View style={{flex: 1, marginRight: 10}}>
        <AppText
          role="titleSmall"
          numberOfLines={1}
          style={{color: colors.onSurface, fontWeight: '600'}}>
          {item.title}
        </AppText>
        <AppText
          role="bodySmall"
          style={{color: colors.onSurfaceVariant, marginTop: 2}}>
          {item.plays} {item.plays === 1 ? 'play' : 'plays'} ·{' '}
          {formatWatchDuration(item.ms)}
        </AppText>
        <View
          style={{
            backgroundColor: colors.surfaceContainerHighest,
            borderRadius: 3,
            height: 4,
            marginTop: 7,
            overflow: 'hidden',
          }}>
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 3,
              height: 4,
              width: `${barWidth}%`,
            }}
          />
        </View>
      </View>
    </Pressable>
  );
};

const HighlightCard = ({
  item,
  caption,
  fallbackIcon,
  playsText,
  onOpen,
}: {
  item: TitleRangeStats;
  caption: string;
  fallbackIcon: 'filmstrip' | 'replay';
  playsText: string;
  onOpen: (item: TitleRangeStats) => void;
}) => {
  const colors = useM3Colors();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!item.infoUrl}
      onPress={() => onOpen(item)}
      style={({pressed}) => ({opacity: pressed ? 0.85 : 1})}>
      <Surface level="low" style={{marginBottom: 16, padding: 16}}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <View
            style={{
              width: 58,
              height: 80,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: colors.surfaceContainerHighest,
            }}>
            {item.poster ? (
              <PosterImage uri={item.poster} />
            ) : (
              <View
                style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <MaterialCommunityIcons
                  name={fallbackIcon}
                  size={22}
                  color={colors.outline}
                />
              </View>
            )}
          </View>
          <View style={{flex: 1, marginLeft: 16}}>
            <AppText
              role="labelSmall"
              style={{
                color: colors.primary,
                fontWeight: '700',
                letterSpacing: 1.1,
                textTransform: 'uppercase',
              }}>
              {caption}
            </AppText>
            <AppText
              role="titleLarge"
              numberOfLines={2}
              style={{color: colors.onSurface, fontWeight: '800', marginTop: 4}}>
              {item.title}
            </AppText>
            <AppText
              role="bodySmall"
              style={{color: colors.onSurfaceVariant, marginTop: 6}}>
              {item.plays} {playsText} · {formatWatchDuration(item.ms)}
            </AppText>
          </View>
        </View>
      </Surface>
    </Pressable>
  );
};

const Statistics = ({navigation}: Props) => {
  const colors = useM3Colors();
  const titles = useViewingStatsStore(state => state.titles);
  const clearStats = useViewingStatsStore(state => state.clearStats);
  const [range, setRange] = useState<StatsRangeKey>('week');
  const scrollY = useSharedValue(0);

  const stats = computeRangeStats(titles, range);

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
          translateY: interpolate(
            scrollY.value,
            [30, 60],
            [10, 0],
            Extrapolation.CLAMP,
          ),
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

  const confirmReset = () => {
    showAppDialog({
      title: 'Reset statistics?',
      message:
        'Deletes every recorded watch-time entry on this device. Your Watchlist, Continue watching, and downloads are not affected.',
      variant: 'error',
      actions: [
        {label: 'Cancel'},
        {
          label: 'Reset',
          variant: 'destructive',
          onPress: () => {
            clearStats();
            ToastAndroid.show('Statistics reset', ToastAndroid.SHORT);
          },
        },
      ],
    });
  };

  const openTitle = (item: TitleRangeStats) => {
    if (!item.infoUrl) {
      return;
    }
    navigation.navigate('Info', {
      link: item.infoUrl,
      provider: item.providerValue,
      poster: item.poster,
    });
  };

  const isEmpty = stats.totalMs <= 0 && stats.plays <= 0;
  const maxMs = stats.byTitle[0]?.ms ?? 0;
  const showMostReplayed =
    stats.mostReplayed &&
    stats.favorite &&
    stats.mostReplayed.id !== stats.favorite.id &&
    stats.mostReplayed.plays > 0;

  return (
    <AmbientBackground>
      <View style={{flex: 1}}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent={true}
        />

        {/* Sticky Top Header Bar */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingTop: (StatusBar.currentHeight || 20) + 5,
              paddingBottom: 15,
              zIndex: 10,
            },
            headerContainerStyle,
          ]}>
          <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({pressed}) => ({
                opacity: pressed ? 0.7 : 1,
                padding: 4,
                marginLeft: -4,
              })}>
              <Ionicons name="arrow-back" size={28} color="#ffffff" />
            </Pressable>
            <AnimatedAppText
              style={[
                {color: '#ffffff', fontSize: 20, marginLeft: 20},
                headerTextStyle,
              ]}>
              Statistics
            </AnimatedAppText>
          </View>
          <IconButton
            icon="trash-can-outline"
            label="Reset statistics"
            onPress={confirmReset}
          />
        </Animated.View>

        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          overScrollMode="always"
          entering={FadeInUp.springify()}
          layout={Layout.springify()}
          contentContainerStyle={{
            paddingTop: (StatusBar.currentHeight || 20) + 85,
            paddingBottom: 120,
            flexGrow: 1,
          }}>
          {/* Large Scrolling Header */}
          <View style={{paddingHorizontal: 20, marginBottom: 20, marginTop: 10}}>
            <AppText role="headlineLarge" style={{color: '#ffffff', fontSize: 34}}>
              Statistics
            </AppText>
            <AppText
              role="bodyMedium"
              style={{color: colors.onSurfaceVariant, marginTop: 6}}>
              Your watch time, top titles, and habits
            </AppText>
          </View>

          <View style={{paddingHorizontal: 20, marginBottom: 20}}>
            <AppText
              role="labelLarge"
              style={{color: colors.onSurfaceVariant, marginBottom: 10}}>
              Time range
            </AppText>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
              {STATS_RANGES.map(item => (
                <RangeChip
                  key={item.key}
                  label={item.label}
                  selected={range === item.key}
                  onPress={() => setRange(item.key)}
                />
              ))}
            </View>
          </View>

          <View style={{paddingHorizontal: 20}}>
            <LinearGradient
              colors={[
                colors.primaryContainer,
                colors.secondaryContainer,
                colors.surfaceContainer,
              ]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={{
                borderRadius: 28,
                padding: 22,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.outlineVariant,
              }}>
              <AppText
                role="titleSmall"
                style={{color: colors.onPrimaryContainer, opacity: 0.85}}>
                Total watch time
              </AppText>
              <AppText
                role="headlineLarge"
                style={{
                  color: colors.onPrimaryContainer,
                  fontSize: 44,
                  fontWeight: '800',
                  marginTop: 6,
                  letterSpacing: -1,
                }}>
                {formatWatchDuration(stats.totalMs, true)}
              </AppText>
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.outlineVariant,
                  marginVertical: 16,
                  opacity: 0.5,
                }}
              />
              <View style={{flexDirection: 'row'}}>
                <StatTile value={String(stats.plays)} label="Plays" />
                <View
                  style={{
                    width: 1,
                    backgroundColor: colors.outlineVariant,
                    opacity: 0.5,
                  }}
                />
                <StatTile
                  value={String(stats.uniqueTitles)}
                  label="Unique titles"
                />
                <View
                  style={{
                    width: 1,
                    backgroundColor: colors.outlineVariant,
                    opacity: 0.5,
                  }}
                />
                <StatTile value={String(stats.activeDays)} label="Active days" />
              </View>
            </LinearGradient>

            {isEmpty ? (
              <Surface level="low" style={{padding: 24, alignItems: 'center'}}>
                <MaterialCommunityIcons
                  name="chart-donut"
                  size={56}
                  color={colors.onSurfaceVariant}
                />
                <AppText
                  role="titleMedium"
                  style={{
                    color: colors.onSurface,
                    fontWeight: '700',
                    marginTop: 14,
                    textAlign: 'center',
                  }}>
                  No watch history yet
                </AppText>
                <AppText
                  role="bodyMedium"
                  style={{
                    color: colors.onSurfaceVariant,
                    marginTop: 6,
                    textAlign: 'center',
                  }}>
                  Play something and come back — your watch time, favorite
                  titles, and daily habits will show up here.
                </AppText>
              </Surface>
            ) : (
              <>
                <Surface level="low" style={{marginBottom: 16, padding: 18}}>
                  <AppText
                    role="titleMedium"
                    style={{
                      color: colors.onSurface,
                      fontWeight: '700',
                      marginBottom: 4,
                    }}>
                    Time by title
                  </AppText>
                  <AppText
                    role="bodySmall"
                    style={{color: colors.onSurfaceVariant, marginBottom: 14}}>
                    Share of your total watch time in this range
                  </AppText>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 18,
                    }}>
                    <StatsDonut
                      segments={stats.segments}
                      centerLabel={formatWatchDuration(stats.totalMs)}
                      centerCaption="watch time"
                      labelColor={colors.onSurface}
                      captionColor={colors.onSurfaceVariant}
                    />
                    <View style={{flex: 1, minWidth: 150, gap: 10}}>
                      {stats.segments.map(segment => (
                        <View
                          key={segment.label}
                          style={{flexDirection: 'row', alignItems: 'center'}}>
                          <View
                            style={{
                              backgroundColor: segment.color,
                              borderRadius: 6,
                              height: 10,
                              marginRight: 10,
                              width: 10,
                            }}
                          />
                          <AppText
                            role="bodySmall"
                            numberOfLines={1}
                            style={{color: colors.onSurface, flex: 1}}>
                            {segment.label}
                          </AppText>
                          <AppText
                            role="labelLarge"
                            style={{
                              color: colors.onSurfaceVariant,
                              marginLeft: 8,
                            }}>
                            {Math.round(segment.share * 100)}%
                          </AppText>
                        </View>
                      ))}
                    </View>
                  </View>
                </Surface>

                {stats.favorite ? (
                  <HighlightCard
                    item={stats.favorite}
                    caption="Favorite title"
                    fallbackIcon="filmstrip"
                    playsText={stats.favorite.plays === 1 ? 'play' : 'plays'}
                    onOpen={openTitle}
                  />
                ) : null}

                {showMostReplayed && stats.mostReplayed ? (
                  <HighlightCard
                    item={stats.mostReplayed}
                    caption="Most replayed"
                    fallbackIcon="replay"
                    playsText="plays"
                    onOpen={openTitle}
                  />
                ) : null}

                <Surface
                  level="low"
                  style={{paddingHorizontal: 12, paddingVertical: 8}}>
                  <AppText
                    role="titleMedium"
                    style={{
                      color: colors.onSurface,
                      fontWeight: '700',
                      paddingHorizontal: 8,
                      paddingTop: 6,
                      paddingBottom: 4,
                    }}>
                    Top titles
                  </AppText>
                  {stats.byTitle.slice(0, 10).map((item, index) => (
                    <TitleRow
                      key={`${item.id}-${index}`}
                      rank={index + 1}
                      item={item}
                      maxMs={maxMs}
                      onOpen={openTitle}
                    />
                  ))}
                </Surface>
              </>
            )}
          </View>
        </Animated.ScrollView>
      </View>
    </AmbientBackground>
  );
};

export default Statistics;
