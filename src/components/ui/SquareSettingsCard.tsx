import {View, Pressable, StyleProp, ViewStyle} from 'react-native';
import {useM3Colors} from '../../theme/M3PaletteContext';
import React from 'react';
import AppText from './Text';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface SquareSettingsCardProps {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SquareSettingsCard = ({
  title,
  icon,
  onPress,
  style,
}: SquareSettingsCardProps) => {
  const colors = useM3Colors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.96, {
          damping: 15,
          stiffness: 200,
          mass: 0.5,
        });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, {
          damping: 15,
          stiffness: 200,
          mass: 0.5,
        });
      }}
      onPress={onPress}
      style={[
        {
          backgroundColor: colors.surfaceContainer,
          borderRadius: 24,
          flex: 1, // Let it expand in the grid
          height: 120, // Fixed height instead of square
          padding: 16,
          justifyContent: 'space-between',
        },
        animatedStyle,
        style,
      ]}>
      {/* Icon Container */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 16,
          backgroundColor: colors.surfaceContainerHigh,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <MaterialCommunityIcons name={icon} size={24} color="#d4d4d8" />
      </View>

      {/* Title Text */}
      <AppText
        role="titleSmall"
        style={{
          color: '#ffffff',
          fontWeight: '600',
          marginTop: 12,
        }}
        numberOfLines={2}>
        {title}
      </AppText>
    </AnimatedPressable>
  );
};

export default SquareSettingsCard;
