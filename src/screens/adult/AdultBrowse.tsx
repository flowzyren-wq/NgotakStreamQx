import React, {useMemo, useState} from 'react';
import {Image, Pressable, ScrollView, View} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import SkeletonLoader from '../../components/Skeleton';
import Text from '../../components/ui/Text';
import {useM3Colors} from '../../theme/M3PaletteContext';
import AdultRail from './AdultRail';
import type {AdultCard, AdultFeedSection} from '../../lib/adult/types';

type Props = {
  rails: AdultFeedSection[];
  isLoading: boolean;
  hasError: boolean;
  resolvingUrl: string | null;
  onPlay: (card: AdultCard) => void;
};

const Chip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => {
  const colors = useM3Colors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{selected: active}}
      style={({pressed}) => ({
        backgroundColor: active ? colors.primary : colors.surfaceContainerHigh,
        borderRadius: 999,
        opacity: pressed ? 0.85 : 1,
        paddingHorizontal: 14,
        paddingVertical: 8,
        transform: [{scale: pressed ? 0.97 : 1}],
      })}>
      <Text
        role="labelMedium"
        style={{color: active ? colors.onPrimary : colors.onSurfaceVariant}}>
        {label}
      </Text>
    </Pressable>
  );
};

const HeroSkeleton = () => (
  <View>
    <SkeletonLoader width="100%" height={230} />
    <View style={{gap: 8, paddingHorizontal: 20, paddingTop: 16}}>
      <SkeletonLoader width={120} height={22} />
      <SkeletonLoader width="80%" height={26} />
      <SkeletonLoader width={110} height={36} />
    </View>
    <View
      style={{gap: 8, flexDirection: 'row', marginTop: 24, paddingHorizontal: 20}}>
      <SkeletonLoader width={72} height={32} />
      <SkeletonLoader width={86} height={32} />
      <SkeletonLoader width={78} height={32} />
    </View>
    <View style={{marginTop: 28}}>
      <SkeletonLoader width={180} height={22} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{gap: 12, paddingHorizontal: 20, paddingTop: 14}}>
        {[0, 1, 2, 3, 4].map(i => (
          <SkeletonLoader key={i} width={124} height={186} />
        ))}
      </ScrollView>
    </View>
    <View style={{marginTop: 28}}>
      <SkeletonLoader width={150} height={22} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{gap: 12, paddingHorizontal: 20, paddingTop: 14}}>
        {[0, 1, 2, 3, 4].map(i => (
          <SkeletonLoader key={i} width={124} height={186} />
        ))}
      </ScrollView>
    </View>
  </View>
);

const AdultBrowse = React.memo(
  ({rails, isLoading, hasError, resolvingUrl, onPlay}: Props) => {
    const colors = useM3Colors();
    const [activeSite, setActiveSite] = useState<string>('all');

    const hero = useMemo(() => {
      for (const rail of rails) {
        const withThumb = rail.cards.find(card => !!card.thumb);
        if (withThumb) {
          return withThumb;
        }
      }
      return rails[0]?.cards[0] ?? null;
    }, [rails]);

    const visibleRails = useMemo(
      () =>
        activeSite === 'all'
          ? rails
          : rails.filter(rail => rail.siteId === activeSite),
      [rails, activeSite],
    );

    if (isLoading && rails.length === 0) {
      return <HeroSkeleton />;
    }

    if (hasError && rails.length === 0) {
      return (
        <View className="m-4 min-h-64 items-center justify-center rounded-3xl bg-m3-error-container p-4">
          <Text
            role="titleMediumEmphasized"
            className="text-center text-m3-on-error-container">
            Gagal memuat daftar situs
          </Text>
          <Text
            role="bodyMedium"
            className="mt-1 text-center text-m3-on-error-container">
            Tarik ke bawah untuk muat ulang
          </Text>
        </View>
      );
    }

    if (rails.length === 0) {
      return (
        <View
          className="m-4 min-h-64 items-center justify-center rounded-3xl p-4"
          style={{
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: colors.outlineVariant,
          }}>
          <Ionicons
            name="cloud-offline-outline"
            size={36}
            color={colors.onSurfaceVariant}
          />
          <Text
            role="titleMedium"
            className="mt-3 text-center"
            style={{color: colors.onSurface}}>
            Tidak ada situs yang merespons
          </Text>
          <Text
            role="bodyMedium"
            className="mt-1 text-center"
            style={{color: colors.onSurfaceVariant}}>
            Tarik ke bawah untuk muat ulang, atau pakai menu pencarian
          </Text>
        </View>
      );
    }

    return (
      <View>
        {hero ? (
          <Pressable
            onPress={() => onPlay(hero)}
            accessibilityRole="button"
            accessibilityLabel={`Putar ${hero.title}`}
            style={({pressed}) => ({
              transform: [{scale: pressed ? 0.995 : 1}],
            })}>
            <View style={{height: 230, width: '100%'}}>
              {hero.thumb ? (
                <Image
                  source={{uri: hero.thumb}}
                  resizeMode="cover"
                  style={{height: '100%', width: '100%'}}
                />
              ) : (
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: colors.surfaceContainerHighest,
                    height: '100%',
                    justifyContent: 'center',
                    width: '100%',
                  }}>
                  <Ionicons
                    name="play-circle-outline"
                    size={54}
                    color={colors.onSurfaceVariant}
                  />
                </View>
              )}
              <LinearGradient
                colors={[
                  'rgba(0,0,0,0.12)',
                  'rgba(0,0,0,0.45)',
                  colors.background,
                ]}
                locations={[0, 0.5, 1]}
                style={{position: 'absolute', inset: 0}}
              />
              <View
                style={{
                  bottom: 14,
                  gap: 8,
                  left: 20,
                  position: 'absolute',
                  right: 20,
                }}>
                <View
                  style={{
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    borderRadius: 999,
                    flexDirection: 'row',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}>
                  <Text role="labelSmall" style={{color: '#FFFFFF'}}>
                    {hero.siteName}
                  </Text>
                </View>
                <Text
                  role="headlineSmallEmphasized"
                  numberOfLines={2}
                  style={{
                    color: '#FFFFFF',
                    textShadowColor: 'rgba(0,0,0,0.6)',
                    textShadowRadius: 6,
                  }}>
                  {hero.title}
                </Text>
                <View
                  style={{
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    backgroundColor: colors.primary,
                    borderRadius: 999,
                    flexDirection: 'row',
                    gap: 6,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}>
                  <Ionicons name="play" size={16} color={colors.onPrimary} />
                  <Text role="labelLarge" style={{color: colors.onPrimary}}>
                    Putar
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{gap: 8, paddingHorizontal: 20, paddingTop: 16}}
          style={{flexGrow: 0}}>
          <Chip
            label="Semua"
            active={activeSite === 'all'}
            onPress={() => setActiveSite('all')}
          />
          {rails.map(rail => (
            <Chip
              key={rail.siteId}
              label={rail.siteName}
              active={activeSite === rail.siteId}
              onPress={() => setActiveSite(rail.siteId)}
            />
          ))}
        </ScrollView>

        {isLoading && rails.length > 0 ? (
          <View style={{alignItems: 'center', paddingTop: 20}}>
            <SkeletonLoader width={180} height={22} />
          </View>
        ) : null}

        {visibleRails.map(rail => (
          <AdultRail
            key={rail.siteId}
            title={`Terbaru · ${rail.siteName}`}
            cards={rail.cards}
            resolvingUrl={resolvingUrl}
            onPlay={onPlay}
          />
        ))}

        <View style={{height: 8}} />
      </View>
    );
  },
);

export default AdultBrowse;
