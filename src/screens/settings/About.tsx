import React, {useState} from 'react';
import {
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  ToastAndroid,
  View,
} from 'react-native';
import Animated, {FadeInUp} from 'react-native-reanimated';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AppText from '../../components/ui/Text';
import AmbientBackground from '../../components/ui/AmbientBackground';
import {useM3Colors} from '../../theme/M3PaletteContext';

const DEVELOPER_NAME = 'QxShaa';
const DEFAULT_PACKAGE = 'id.qxshaa.ngotakstreamqx';

const InfoRow = ({label, value}: {label: string; value: string}) => {
  const colors = useM3Colors();
  return (
    <View style={styles.infoRow}>
      <AppText style={[styles.infoLabel, {color: colors.onSurfaceVariant}]}>
        {label}
      </AppText>
      <AppText style={[styles.infoValue, {color: colors.onSurface}]}>
        {value}
      </AppText>
    </View>
  );
};

const Divider = () => {
  const colors = useM3Colors();
  const color = colors.outlineVariant
    ? `${colors.outlineVariant}50`
    : 'rgba(255,255,255,0.08)';
  return <View style={[styles.divider, {backgroundColor: color}]} />;
};

const About = () => {
  const navigation = useNavigation();
  useSafeAreaInsets();
  const colors = useM3Colors();
  const [logoTaps, setLogoTaps] = useState(0);

  const appVersion =
    Application.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    '1.0.2';
  const packageName =
    Application.applicationId ||
    Constants.expoConfig?.android?.package ||
    DEFAULT_PACKAGE;

  const onLogoPress = () => {
    const next = logoTaps + 1;
    setLogoTaps(next);
    if (next >= 7) {
      ToastAndroid.show(`Built with love by ${DEVELOPER_NAME}`, ToastAndroid.SHORT);
      setLogoTaps(0);
    }
  };

  return (
    <AmbientBackground>
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <View
          style={[
            styles.header,
            {paddingTop: (StatusBar.currentHeight || 20) + 10},
          ]}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={({pressed}) => [styles.backButton, pressed && {opacity: 0.6}]}>
            <Ionicons name="arrow-back" size={26} color={colors.onSurface} />
          </Pressable>
          <AppText style={[styles.headerTitle, {color: colors.onSurface}]}>
            About
          </AppText>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <Animated.ScrollView
          entering={FadeInUp.springify()}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
            <Pressable onPress={onLogoPress} style={styles.logoWrapper}>
              <Image
                source={require('../../../assets/icon_transparent.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Pressable>
            <AppText style={[styles.appName, {color: colors.onSurface}]}>
              NgotakStream Qx
            </AppText>
            <AppText
              style={[styles.appTagline, {color: colors.onSurfaceVariant}]}>
              Cinematic Streaming Client
            </AppText>
            <View
              style={[
                styles.versionBadge,
                {
                  backgroundColor: colors.primaryContainer,
                  borderColor: `${colors.primary}60`,
                },
              ]}>
              <AppText style={[styles.versionBadgeText, {color: colors.primary}]}>
                v{appVersion}
              </AppText>
            </View>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: `${colors.outlineVariant}60`,
              },
            ]}>
            <InfoRow label="Developer" value={DEVELOPER_NAME} />
            <Divider />
            <InfoRow label="Version" value={appVersion} />
            <Divider />
            <InfoRow label="Build" value="Release" />
            <Divider />
            <InfoRow label="Package" value={packageName} />
            <Divider />
            <InfoRow label="License" value="Apache-2.0" />
          </View>

          <View style={{height: 40}} />
        </Animated.ScrollView>
      </View>
    </AmbientBackground>
  );
};

export default About;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'transparent'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {fontSize: 20, fontWeight: '700'},
  headerRightPlaceholder: {width: 40},
  scrollContent: {paddingHorizontal: 18, paddingTop: 12, paddingBottom: 40},
  heroSection: {alignItems: 'center', marginBottom: 28},
  logoWrapper: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {width: 84, height: 84},
  appName: {fontSize: 26, fontWeight: 'bold', letterSpacing: 0.3},
  appTagline: {fontSize: 14, marginTop: 6, textAlign: 'center'},
  versionBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 14,
  },
  versionBadgeText: {fontSize: 12, fontWeight: '700', letterSpacing: 0.5},
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  infoLabel: {fontSize: 15, fontWeight: '500'},
  infoValue: {fontSize: 15, fontWeight: '600'},
  divider: {height: 1},
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  linkLeft: {flexDirection: 'row', alignItems: 'center', gap: 14},
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkLabel: {fontSize: 16, fontWeight: '600'},
});
