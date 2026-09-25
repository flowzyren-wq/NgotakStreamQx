import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import React, {useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  Share,
  ToastAndroid,
  View,
} from 'react-native';
import AppText from '../../../components/ui/Text';
import Button from '../../../components/ui/Button';
import IconButton from '../../../components/ui/IconButton';
import Surface from '../../../components/ui/Surface';
import useThemeStore from '../../../lib/zustand/themeStore';
import {showAppDialog} from '../../../lib/zustand/appDialogStore';
import {settingsStorage} from '../../../lib/storage';
import {useM3Colors} from '../../../theme/M3PaletteContext';
import {
  parseThemeImport,
  serializeThemeForExport,
  ThemeColorKey,
  ThemeProfile,
} from '../../../theme/themeProfiles';
import ThemeEditorSheet from './ThemeEditorSheet';

const STRIPE_KEYS: ThemeColorKey[] = [
  'primary',
  'secondary',
  'accent',
  'background',
  'surface',
  'text',
];

const ThemeStudio = () => {
  const colors = useM3Colors();
  const profiles = useThemeStore(state => state.profiles);
  const activeProfileId = useThemeStore(state => state.activeProfileId);
  const setActiveProfile = useThemeStore(state => state.setActiveProfile);
  const deleteProfile = useThemeStore(state => state.deleteProfile);
  const saveProfile = useThemeStore(state => state.saveProfile);
  const resetToDefaultTheme = useThemeStore(
    state => state.resetToDefaultTheme,
  );
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<ThemeProfile | null>(null);
  const [importing, setImporting] = useState(false);

  const applyProfile = (profile: ThemeProfile) => {
    if (profile.id === activeProfileId) {
      return;
    }
    setActiveProfile(profile.id);
    ToastAndroid.show(`Applied "${profile.name}"`, ToastAndroid.SHORT);
  };

  const openCreate = () => {
    setEditing(null);
    setEditorVisible(true);
  };

  const openEdit = (profile: ThemeProfile) => {
    setEditing(profile);
    setEditorVisible(true);
  };

  const exportProfile = async (profile: ThemeProfile) => {
    try {
      await Share.share({
        title: `${profile.name} (NgotakStream Qx theme)`,
        message: JSON.stringify(serializeThemeForExport(profile), null, 2),
      });
    } catch {
      ToastAndroid.show('Could not open the share sheet', ToastAndroid.SHORT);
    }
  };

  const importTheme = async () => {
    if (importing) {
      return;
    }
    setImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', 'text/plain'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) {
        return;
      }
      let text: string;
      try {
        text = await FileSystem.readAsStringAsync(result.assets[0].uri);
      } catch {
        showAppDialog({
          title: 'Import failed',
          message: 'Could not read the selected file.',
          variant: 'error',
          actions: [{label: 'OK'}],
        });
        return;
      }
      const parsed = parseThemeImport(text);
      if (!parsed.ok) {
        showAppDialog({
          title: 'Import failed',
          message: parsed.error,
          variant: 'error',
          actions: [{label: 'OK'}],
        });
        return;
      }
      const profile = saveProfile(parsed.draft, {activate: true});
      ToastAndroid.show(
        `Imported & applied "${profile.name}"`,
        ToastAndroid.LONG,
      );
    } finally {
      setImporting(false);
    }
  };

  const confirmDelete = (profile: ThemeProfile) => {
    showAppDialog({
      title: `Delete "${profile.name}"?`,
      message: 'This removes the saved theme from this device.',
      variant: 'error',
      actions: [
        {label: 'Cancel'},
        {
          label: 'Delete',
          variant: 'destructive',
          onPress: () => {
            deleteProfile(profile.id);
            ToastAndroid.show('Theme deleted', ToastAndroid.SHORT);
          },
        },
      ],
    });
  };

  const confirmReset = () => {
    showAppDialog({
      title: 'Reset to default theme?',
      message:
        'Applies the Signature theme derived from the app icon. Saved themes are kept — only the active theme is reset.',
      actions: [
        {label: 'Cancel'},
        {
          label: 'Reset',
          onPress: () => {
            resetToDefaultTheme();
            ToastAndroid.show('Default theme applied', ToastAndroid.SHORT);
          },
        },
      ],
    });
  };

  const activeProfile =
    profiles.find(profile => profile.id === activeProfileId) ?? null;

  return (
    <View style={{gap: 16}}>
      <View>
        <AppText
          role="titleMedium"
          style={{
            color: colors.primary,
            fontWeight: 'bold',
            marginBottom: 12,
            marginLeft: 8,
          }}>
          Theme Studio
        </AppText>
        <Surface level="low" className="overflow-hidden">
          <View style={{padding: 16}}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 14,
              }}>
              <View
                style={{
                  height: 44,
                  width: 44,
                  borderRadius: 22,
                  backgroundColor: activeProfile
                    ? activeProfile.primary
                    : colors.primary,
                  borderWidth: 2,
                  borderColor: colors.outlineVariant,
                  marginRight: 12,
                }}
              />
              <View style={{flex: 1}}>
                <AppText
                  role="titleMedium"
                  style={{color: colors.onSurface, fontWeight: '700'}}>
                  {activeProfile ? activeProfile.name : 'Signature (default)'}
                </AppText>
                <AppText
                  role="bodySmall"
                  style={{color: colors.onSurfaceVariant, marginTop: 2}}>
                  {activeProfile
                    ? 'Custom theme active across the app'
                    : 'Material You engine — create a theme to override'}
                </AppText>
              </View>
            </View>
            <View style={{flexDirection: 'row', gap: 10, flexWrap: 'wrap'}}>
              <Button variant="filled" compact onPress={openCreate}>
                Create theme
              </Button>
              <Button
                variant="tonal"
                compact
                onPress={importTheme}
                disabled={importing}>
                {importing ? 'Importing…' : 'Import theme'}
              </Button>
              <Button variant="text" compact onPress={confirmReset}>
                Reset default
              </Button>
            </View>
            {importing ? (
              <ActivityIndicator
                color={colors.primary}
                style={{marginTop: 10}}
              />
            ) : null}
          </View>

          {profiles.length > 0 ? (
            <View
              style={{
                height: 1,
                backgroundColor: colors.outlineVariant,
                marginHorizontal: 16,
                opacity: 0.5,
              }}
            />
          ) : null}

          {profiles.map((profile, index) => {
            const isActive = profile.id === activeProfileId;
            return (
              <View key={profile.id}>
                {index > 0 ? (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.outlineVariant,
                      marginHorizontal: 16,
                      opacity: 0.5,
                    }}
                  />
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Apply ${profile.name}`}
                  onPress={() => applyProfile(profile)}
                  style={({pressed}) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    paddingVertical: 12,
                    backgroundColor: pressed
                      ? colors.surfaceContainerHighest
                      : 'transparent',
                  })}>
                  <View
                    style={{
                      flexDirection: 'row',
                      marginRight: 12,
                      borderRadius: 14,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: colors.outlineVariant,
                    }}>
                    {STRIPE_KEYS.map(key => (
                      <View
                        key={key}
                        style={{
                          height: 34,
                          width: 14,
                          backgroundColor: profile[key],
                        }}
                      />
                    ))}
                  </View>
                  <View style={{flex: 1, marginRight: 8}}>
                    <AppText
                      role="titleSmall"
                      style={{color: colors.onSurface, fontWeight: '600'}}
                      numberOfLines={1}>
                      {profile.name}
                    </AppText>
                    <AppText
                      role="bodySmall"
                      style={{color: colors.onSurfaceVariant}}>
                      {isActive ? 'Active — tap to re-apply' : 'Tap to apply'}
                    </AppText>
                  </View>
                  {isActive ? (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={22}
                      color={colors.primary}
                    />
                  ) : null}
                </Pressable>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingBottom: 8,
                  }}>
                  <IconButton
                    icon="pencil-outline"
                    label={`Edit ${profile.name}`}
                    onPress={() => openEdit(profile)}
                  />
                  <IconButton
                    icon="export-variant"
                    label={`Export ${profile.name}`}
                    onPress={() => exportProfile(profile)}
                  />
                  <IconButton
                    icon="trash-can-outline"
                    label={`Delete ${profile.name}`}
                    contentColor={colors.error}
                    onPress={() => confirmDelete(profile)}
                  />
                </View>
              </View>
            );
          })}

          {profiles.length === 0 ? (
            <View
              style={{
                paddingBottom: 16,
                paddingHorizontal: 16,
                alignItems: 'center',
              }}>
              <AppText
                role="bodySmall"
                style={{color: colors.onSurfaceVariant, textAlign: 'center'}}>
                No saved themes yet. Create one — or export from a friend and
                import it here.
                {settingsStorage.getAccentSource() === 'wallpaper'
                  ? ' Dynamic Material You is currently active.'
                  : ''}
              </AppText>
            </View>
          ) : null}
        </Surface>
      </View>

      <ThemeEditorSheet
        visible={editorVisible}
        editing={editing}
        onClose={() => setEditorVisible(false)}
      />
    </View>
  );
};

export default ThemeStudio;
