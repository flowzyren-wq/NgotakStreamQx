import React, {ReactNode} from 'react';
import {View, StyleSheet} from 'react-native';
import AppText from './Text';
import {useM3Colors} from '../../theme/M3PaletteContext';

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

const SettingsSection = ({title, children}: SettingsSectionProps) => {
  const colors = useM3Colors();
  return (
    <View style={{marginBottom: 24}}>
      <AppText
        role="labelSmall"
        style={[styles.headerTitle, {color: colors.onSurfaceVariant}]}>
        {title.toUpperCase()}
      </AppText>
      <View
        style={{
          borderRadius: 24,
          backgroundColor: colors.surfaceContainer,
          overflow: 'hidden',
        }}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerTitle: {
    letterSpacing: 1.2,
    paddingHorizontal: 8,
    paddingBottom: 8,
    fontWeight: 'bold',
  },
});

export default SettingsSection;
