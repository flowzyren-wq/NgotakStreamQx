import React from 'react';
import {ActivityIndicator, useWindowDimensions, View} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MediaPosterCard from '../../components/MediaPosterCard';
import Text from '../../components/ui/Text';
import {useM3Colors} from '../../theme/M3PaletteContext';
import type {AdultCard} from '../../lib/adult/types';

type Props = {
  searching: boolean;
  error: string | null;
  results: AdultCard[];
  searchedTerm: string;
  resolvingUrl: string | null;
  onPlay: (card: AdultCard) => void;
};

const AdultSearchPanel = React.memo(
  ({searching, error, results, searchedTerm, resolvingUrl, onPlay}: Props) => {
    const colors = useM3Colors();
    const {width} = useWindowDimensions();
    const columns = width > 600 ? 3 : 2;
    const cardWidth = Math.min(
      200,
      Math.floor((width - 40 - 12 * (columns - 1)) / columns),
    );

    const renderCard = (card: AdultCard) => {
      const dimmed = resolvingUrl !== null && resolvingUrl !== card.url;
      return (
        <View
          key={`${card.siteId}|${card.url}`}
          style={{opacity: dimmed ? 0.45 : 1}}>
          <MediaPosterCard
            title={card.title}
            poster={card.thumb}
            subtitle={card.siteName}
            width={cardWidth}
            onPress={() => onPlay(card)}
          />
        </View>
      );
    };

    if (searching) {
      return (
        <View
          style={{alignItems: 'center', paddingTop: 64, paddingHorizontal: 24}}>
          <ActivityIndicator color={colors.primary} />
          <Text
            role="bodyMedium"
            style={{
              color: colors.onSurfaceVariant,
              marginTop: 12,
              textAlign: 'center',
            }}>
            Mencari di situs terdaftar...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View
          className="mx-4 rounded-xl px-4 py-4"
          style={{
            borderWidth: 1,
            borderColor: colors.errorContainer,
            backgroundColor: colors.errorContainer,
            marginTop: 16,
          }}>
          <Text role="bodyMedium" style={{color: colors.onErrorContainer}}>
            {error}
          </Text>
        </View>
      );
    }

    if (!searchedTerm) {
      return (
        <View
          style={{alignItems: 'center', paddingTop: 64, paddingHorizontal: 24}}>
          <Ionicons
            name="search-outline"
            size={40}
            color={colors.onSurfaceVariant}
          />
          <Text
            role="titleMedium"
            style={{color: colors.onSurface, marginTop: 12, textAlign: 'center'}}>
            Cari judul dari semua situs
          </Text>
          <Text
            role="bodyMedium"
            style={{
              color: colors.onSurfaceVariant,
              marginTop: 6,
              textAlign: 'center',
            }}>
            Hasil digabung dari situs yang terdaftar di bagian ini.
          </Text>
        </View>
      );
    }

    if (results.length === 0) {
      return (
        <View
          style={{alignItems: 'center', paddingTop: 48, paddingHorizontal: 24}}>
          <Ionicons
            name="file-tray-outline"
            size={36}
            color={colors.onSurfaceVariant}
          />
          <Text
            role="bodyMedium"
            style={{
              color: colors.onSurfaceVariant,
              marginTop: 10,
              textAlign: 'center',
            }}>
            Tidak ada hasil untuk "{searchedTerm}". Coba kata kunci lain.
          </Text>
        </View>
      );
    }

    return (
      <View style={{paddingTop: 8}}>
        <Text
          role="bodySmall"
          style={{
            color: colors.onSurfaceVariant,
            marginBottom: 12,
            paddingHorizontal: 20,
          }}>
          {results.length} hasil untuk "{searchedTerm}"
        </Text>
        <View
          style={{
            columnGap: 12,
            flexDirection: 'row',
            flexWrap: 'wrap',
            paddingHorizontal: 20,
            rowGap: 16,
          }}>
          {results.slice(0, 60).map(renderCard)}
        </View>
        <View style={{height: 12}} />
      </View>
    );
  },
);

export default AdultSearchPanel;
