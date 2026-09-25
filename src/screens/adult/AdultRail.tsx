import React from 'react';
import {ScrollView, View} from 'react-native';
import MediaPosterCard from '../../components/MediaPosterCard';
import Text from '../../components/ui/Text';
import {useM3Colors} from '../../theme/M3PaletteContext';
import type {AdultCard} from '../../lib/adult/types';

type Props = {
  title: string;
  cards: AdultCard[];
  resolvingUrl: string | null;
  onPlay: (card: AdultCard) => void;
};

const AdultRail = React.memo(({title, cards, resolvingUrl, onPlay}: Props) => {
  const colors = useM3Colors();

  return (
    <View style={{gap: 14, marginTop: 28}}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
        }}>
        <Text
          role="titleLargeEmphasized"
          style={{color: colors.onBackground, flex: 1, marginRight: 12}}
          numberOfLines={1}>
          {title}
        </Text>
        <Text role="bodySmall" style={{color: colors.onSurfaceVariant}}>
          {cards.length} video
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{gap: 12, paddingHorizontal: 20, paddingRight: 28}}>
        {cards.map(card => {
          const dimmed = resolvingUrl !== null && resolvingUrl !== card.url;
          return (
            <View key={card.url} style={{opacity: dimmed ? 0.45 : 1}}>
              <MediaPosterCard
                title={card.title}
                poster={card.thumb}
                width={124}
                onPress={() => onPlay(card)}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
});

export default AdultRail;
