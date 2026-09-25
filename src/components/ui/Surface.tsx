import React from 'react';
import {View, ViewProps} from 'react-native';
import {useM3Colors} from '../../theme/M3PaletteContext';

type SurfaceLevel = 'lowest' | 'low' | 'default' | 'high' | 'highest';

interface SurfaceProps extends ViewProps {
  level?: SurfaceLevel;
  outlined?: boolean;
}

const Surface = ({
  level = 'default',
  outlined = false,
  style,
  ...props
}: SurfaceProps) => {
  const colors = useM3Colors();
  const backgrounds: Record<SurfaceLevel, string> = {
    lowest: colors.surfaceContainerLowest,
    low: colors.surfaceContainerLow,
    default: colors.surfaceContainer,
    high: colors.surfaceContainerHigh,
    highest: colors.surfaceContainerHighest,
  };

  return (
    <View
      style={{
        alignSelf: 'stretch',
        backgroundColor: backgrounds[level],
        borderRadius: 28,
        borderWidth: outlined ? 1 : 0,
        borderColor: outlined ? colors.outline : undefined,
        overflow: 'hidden',
      }}>
      <View {...props} style={style} />
    </View>
  );
};

export default Surface;
