import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Button from '../../../components/ui/Button';
import AppText from '../../../components/ui/Text';
import Surface from '../../../components/ui/Surface';
import ColorField from './ColorField';
import useThemeStore from '../../../lib/zustand/themeStore';
import {useM3Colors} from '../../../theme/M3PaletteContext';
import {M3_SEEDS} from '../../../theme/seeds';
import {
  DEFAULT_THEME_PROFILE_DRAFT,
  ThemeColorKey,
  ThemeProfile,
  ThemeProfileDraft,
} from '../../../theme/themeProfiles';

const FIELDS: {key: ThemeColorKey; label: string; description: string}[] = [
  {key: 'primary', label: 'Primary', description: 'Brand color, main actions'},
  {key: 'secondary', label: 'Secondary', description: 'Supporting elements'},
  {key: 'accent', label: 'Accent', description: 'Highlights & progress'},
  {key: 'background', label: 'Background', description: 'App background'},
  {key: 'surface', label: 'Surface', description: 'Cards & sheets'},
  {key: 'text', label: 'Text', description: 'Primary text color'},
];

const PREVIEW_KEYS: ThemeColorKey[] = [
  'background',
  'surface',
  'primary',
  'secondary',
  'accent',
  'text',
];

const PRESETS: ThemeProfileDraft[] = [
  {...DEFAULT_THEME_PROFILE_DRAFT, name: 'Signature'},
  ...M3_SEEDS.filter(seed => seed.name !== 'White').map(seed => ({
    ...DEFAULT_THEME_PROFILE_DRAFT,
    name: seed.name,
    primary: seed.color,
    accent: seed.color,
  })),
];

type ThemeEditorSheetProps = {
  visible: boolean;
  /** Profile being edited; null/undefined creates a new one. */
  editing?: ThemeProfile | null;
  onClose: () => void;
};

const ThemeEditorSheet = ({visible, editing, onClose}: ThemeEditorSheetProps) => {
  const colors = useM3Colors();
  const saveProfile = useThemeStore(state => state.saveProfile);
  const setPreviewProfile = useThemeStore(state => state.setPreviewProfile);
  const profiles = useThemeStore(state => state.profiles);

  const initial = useMemo<ThemeProfileDraft>(
    () =>
      editing
        ? {
            name: editing.name,
            primary: editing.primary,
            secondary: editing.secondary,
            accent: editing.accent,
            background: editing.background,
            surface: editing.surface,
            text: editing.text,
          }
        : {...DEFAULT_THEME_PROFILE_DRAFT},
    [editing],
  );

  const [draft, setDraft] = useState<ThemeProfileDraft>(initial);
  const [nameError, setNameError] = useState(false);
  const draftRef = useRef<ThemeProfileDraft>(initial);

  const toPreview = (next: ThemeProfileDraft): ThemeProfile => ({
    ...next,
    id: editing?.id ?? '__preview__',
    createdAt: editing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  });

  useEffect(() => {
    if (!visible) {
      setPreviewProfile(null);
      return;
    }
    draftRef.current = initial;
    setDraft(initial);
    setNameError(false);
    setPreviewProfile(toPreview(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, editing?.createdAt, editing?.id, setPreviewProfile, visible]);

  const pushDraft = (next: ThemeProfileDraft) => {
    draftRef.current = next;
    setDraft(next);
    setPreviewProfile(toPreview(next));
  };

  const setColor = (key: ThemeColorKey, value: string) => {
    pushDraft({...draftRef.current, [key]: value});
  };

  const applyPreset = (preset: ThemeProfileDraft) => {
    setNameError(false);
    pushDraft(preset);
  };

  const setName = (name: string) => {
    setNameError(false);
    pushDraft({...draftRef.current, name});
  };

  const handleApply = () => {
    const name = draftRef.current.name.trim();
    if (!name) {
      setNameError(true);
      return;
    }
    saveProfile(
      {...draftRef.current, name: name.slice(0, 40)},
      {id: editing?.id, activate: true},
    );
    setPreviewProfile(null);
    ToastAndroid.show(
      editing ? 'Theme updated' : 'Theme created & applied',
      ToastAndroid.SHORT,
    );
    onClose();
  };

  const handleClose = () => {
    setPreviewProfile(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}>
      <View style={{flex: 1, backgroundColor: colors.background}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 44,
            paddingBottom: 14,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.outlineVariant,
            backgroundColor: colors.surface,
          }}>
          <Pressable
            onPress={handleClose}
            hitSlop={10}
            style={({pressed}) => ({padding: 6, opacity: pressed ? 0.6 : 1})}>
            <Ionicons name="close" size={26} color={colors.onSurface} />
          </Pressable>
          <AppText
            role="titleLarge"
            style={{
              flex: 1,
              marginLeft: 12,
              color: colors.onSurface,
              fontWeight: '700',
            }}>
            {editing ? 'Edit theme' : 'New theme'}
          </AppText>
          <Button variant="filled" compact onPress={handleApply}>
            Apply
          </Button>
        </View>

        <ScrollView
          contentContainerStyle={{padding: 20, paddingBottom: 60}}
          keyboardShouldPersistTaps="handled">
          <View
            style={{
              flexDirection: 'row',
              height: 74,
              borderRadius: 18,
              overflow: 'hidden',
              marginBottom: 20,
              borderWidth: 1,
              borderColor: colors.outlineVariant,
            }}>
            {PREVIEW_KEYS.map(key => (
              <View key={key} style={{flex: 1, backgroundColor: draft[key]}} />
            ))}
          </View>

          <AppText
            role="titleMedium"
            style={{color: colors.primary, fontWeight: '700', marginBottom: 8}}>
            Start from
          </AppText>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 20,
            }}>
            {PRESETS.map(preset => {
              const selected =
                draft.primary.toLowerCase() === preset.primary.toLowerCase();
              return (
                <Pressable
                  key={preset.name}
                  accessibilityRole="button"
                  onPress={() => applyPreset(preset)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: selected
                      ? colors.primaryContainer
                      : colors.surfaceContainerHigh,
                    borderColor: selected
                      ? colors.primary
                      : colors.outlineVariant,
                    borderWidth: selected ? 2 : 1,
                    borderRadius: 20,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                  }}>
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: preset.primary,
                    }}
                  />
                  <AppText
                    role="labelMedium"
                    style={{
                      color: selected
                        ? colors.onPrimaryContainer
                        : colors.onSurface,
                    }}>
                    {preset.name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <AppText
            role="titleMedium"
            style={{color: colors.primary, fontWeight: '700', marginBottom: 10}}>
            Theme name
          </AppText>
          <TextInput
            value={draft.name}
            onChangeText={setName}
            maxLength={40}
            placeholder="My theme"
            placeholderTextColor={colors.outline}
            style={{
              backgroundColor: colors.surfaceContainerHigh,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: nameError ? colors.error : colors.outlineVariant,
              color: colors.onSurface,
              fontSize: 16,
              paddingHorizontal: 14,
              paddingVertical: 12,
              marginBottom: nameError ? 6 : 18,
            }}
          />
          {nameError ? (
            <AppText
              role="bodySmall"
              style={{color: colors.error, marginBottom: 14}}>
              Theme name cannot be empty.
            </AppText>
          ) : null}

          <AppText
            role="titleMedium"
            style={{color: colors.primary, fontWeight: '700', marginBottom: 4}}>
            Colors
          </AppText>
          <AppText
            role="bodySmall"
            style={{color: colors.onSurfaceVariant, marginBottom: 8}}>
            Changes preview across the app instantly — Apply saves them.
          </AppText>
          <Surface
            level="low"
            style={{paddingHorizontal: 14, marginBottom: 20}}>
            {FIELDS.map((field, index) => (
              <View key={field.key}>
                {index > 0 ? (
                  <View
                    style={{
                      height: StyleSheet.hairlineWidth,
                      backgroundColor: colors.outlineVariant,
                      opacity: 0.6,
                    }}
                  />
                ) : null}
                <ColorField
                  label={field.label}
                  description={field.description}
                  value={draft[field.key]}
                  onChange={value => setColor(field.key, value)}
                />
              </View>
            ))}
          </Surface>

          <View style={{gap: 10}}>
            <Button variant="filled" onPress={handleApply}>
              {editing ? 'Save changes' : 'Create & apply theme'}
            </Button>
            <Button variant="text" onPress={handleClose}>
              Cancel
            </Button>
          </View>

          <Text
            style={{
              color: colors.outline,
              fontSize: 12,
              textAlign: 'center',
              marginTop: 16,
            }}>
            {profiles.length} theme{profiles.length === 1 ? '' : 's'} saved on
            this device
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default ThemeEditorSheet;
