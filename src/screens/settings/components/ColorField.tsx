import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, {useEffect, useRef, useState} from 'react';
import {PanResponder, Pressable, Text, TextInput, View} from 'react-native';
import AppText from '../../../components/ui/Text';
import {useM3Colors} from '../../../theme/M3PaletteContext';
import {normalizeHexColor} from '../../../theme/themeProfiles';

const SWATCHES = [
  '#FFFFFF',
  '#F2F2F2',
  '#E4E4E4',
  '#C4C4C4',
  '#97979A',
  '#413F40',
  '#171717',
  '#000000',
  '#FFB4AB',
  '#FFD58A',
  '#9BE3B5',
  '#8FB8FF',
];

const HUE_SEGMENTS = 36;

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = normalizeHexColor(hex) ?? '#000000';
  const value = parseInt(normalized.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b]
    .map(channel =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase()}`;

const rgbToHsl = (
  r: number,
  g: number,
  b: number,
): [number, number, number] => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) {
    return [0, 0, lightness];
  }
  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue: number;
  if (max === red) {
    hue = ((green - blue) / delta + (green < blue ? 6 : 0)) / 6;
  } else if (max === green) {
    hue = ((blue - red) / delta + 2) / 6;
  } else {
    hue = ((red - green) / delta + 4) / 6;
  }
  return [hue * 360, saturation, lightness];
};

const hue2rgb = (p: number, q: number, t: number): number => {
  let value = t;
  if (value < 0) {
    value += 1;
  }
  if (value > 1) {
    value -= 1;
  }
  if (value < 1 / 6) {
    return p + (q - p) * 6 * value;
  }
  if (value < 1 / 2) {
    return q;
  }
  if (value < 2 / 3) {
    return p + (q - p) * (2 / 3 - value) * 6;
  }
  return p;
};

const hslToRgb = (
  h: number,
  s: number,
  l: number,
): [number, number, number] => {
  if (s === 0) {
    return [l * 255, l * 255, l * 255];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    hue2rgb(p, q, (h / 360 + 1 / 3) % 1) * 255,
    hue2rgb(p, q, h / 360) * 255,
    hue2rgb(p, q, (h / 360 - 1 / 3 + 1) % 1) * 255,
  ];
};

/**
 * Replaces the hue of `hex` while keeping its saturation & lightness.
 * Near-gray colours get a usable saturation/lightness so the hue is visible.
 */
export const withHue = (hex: string, hue: number): string => {
  const [r, g, b] = hexToRgb(hex);
  const [, saturation, lightness] = rgbToHsl(r, g, b);
  const isGray = saturation < 0.08;
  const nextSaturation = isGray ? 0.65 : saturation;
  const nextLightness = isGray
    ? Math.min(Math.max(lightness, 0.35), 0.75)
    : lightness;
  return rgbToHex(...hslToRgb(hue, nextSaturation, nextLightness));
};

type ColorFieldProps = {
  label: string;
  description?: string;
  value: string;
  onChange: (color: string) => void;
};

const ColorField = ({label, description, value, onChange}: ColorFieldProps) => {
  const colors = useM3Colors();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(value);
  const [hexError, setHexError] = useState(false);
  const trackWidth = useRef(1);
  const hueRef = useRef<number | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setDraft(value);
    setHexError(false);
  }, [value]);

  const commitHex = (text: string) => {
    setDraft(text);
    const normalized = normalizeHexColor(text);
    if (!normalized) {
      setHexError(true);
      return;
    }
    setHexError(false);
    onChangeRef.current(normalized);
  };

  const applyHueAt = (x: number) => {
    const hue = Math.max(
      0,
      Math.min(360, (x / Math.max(1, trackWidth.current)) * 360),
    );
    hueRef.current = hue;
    const next = withHue(valueRef.current, hue);
    valueRef.current = next;
    setDraft(next);
    setHexError(false);
    onChangeRef.current(next);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: event => applyHueAt(event.nativeEvent.locationX),
      onPanResponderMove: event => applyHueAt(event.nativeEvent.locationX),
    }),
  ).current;

  const [red, green, blue] = hexToRgb(value);

  return (
    <View style={{paddingVertical: 4}}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setExpanded(open => !open)}
        style={({pressed}) => ({
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          opacity: pressed ? 0.75 : 1,
        })}>
        <View
          style={{
            height: 36,
            width: 36,
            borderRadius: 18,
            backgroundColor: value,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
            marginRight: 14,
          }}
        />
        <View style={{flex: 1}}>
          <AppText
            role="titleMedium"
            style={{color: colors.onSurface, fontWeight: '600'}}>
            {label}
          </AppText>
          {description ? (
            <AppText
              role="bodySmall"
              style={{color: colors.onSurfaceVariant, marginTop: 2}}>
              {description}
            </AppText>
          ) : null}
        </View>
        <Text
          style={{color: colors.onSurfaceVariant, marginRight: 8, fontSize: 13}}>
          {value}
        </Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.onSurfaceVariant}
        />
      </Pressable>

      {expanded ? (
        <View style={{paddingBottom: 12, gap: 14}}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surfaceContainerHigh,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: hexError ? colors.error : colors.outlineVariant,
              paddingHorizontal: 12,
            }}>
            <Text style={{color: colors.onSurfaceVariant, marginRight: 6}}>
              #
            </Text>
            <TextInput
              value={draft.replace('#', '').toUpperCase()}
              onChangeText={text =>
                commitHex(text.startsWith('#') ? text : `#${text}`)
              }
              autoCapitalize="characters"
              autoCorrect={false}
              keyboardType="ascii-capable"
              maxLength={7}
              placeholder="RRGGBB"
              placeholderTextColor={colors.outline}
              style={{
                flex: 1,
                color: colors.onSurface,
                fontSize: 15,
                letterSpacing: 1.5,
                paddingVertical: 10,
              }}
            />
            <View
              style={{
                height: 22,
                width: 22,
                borderRadius: 6,
                backgroundColor: value,
                borderWidth: 1,
                borderColor: colors.outlineVariant,
              }}
            />
          </View>
          {hexError ? (
            <AppText
              role="bodySmall"
              style={{color: colors.error, marginTop: -6}}>
              Use 3 or 6 hex digits, e.g. #E4E4E4
            </AppText>
          ) : null}

          <View>
            <AppText
              role="labelLarge"
              style={{color: colors.onSurfaceVariant, marginBottom: 8}}>
              Hue — keeps saturation & lightness (grays gain color)
              {hueRef.current !== null
                ? ` · ${Math.round(hueRef.current)}°`
                : null}
            </AppText>
            <View
              {...panResponder.panHandlers}
              onLayout={event => {
                trackWidth.current = event.nativeEvent.layout.width;
              }}
              style={{
                height: 30,
                borderRadius: 15,
                flexDirection: 'row',
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.outlineVariant,
              }}>
              {Array.from({length: HUE_SEGMENTS}, (_, index) => (
                <View
                  key={index}
                  pointerEvents="none"
                  style={{
                    flex: 1,
                    backgroundColor: `hsl(${index * 10}, 80%, 58%)`,
                  }}
                />
              ))}
            </View>
          </View>

          <View>
            <AppText
              role="labelLarge"
              style={{color: colors.onSurfaceVariant, marginBottom: 8}}>
              Quick swatches
            </AppText>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10}}>
              {SWATCHES.map(swatch => (
                <Pressable
                  key={swatch}
                  accessibilityLabel={`Set color ${swatch}`}
                  onPress={() => {
                    hueRef.current = null;
                    onChange(swatch);
                  }}
                  style={({pressed}) => ({
                    height: 34,
                    width: 34,
                    borderRadius: 17,
                    backgroundColor: swatch,
                    borderWidth:
                      value.toUpperCase() === swatch.toUpperCase() ? 3 : 1,
                    borderColor:
                      value.toUpperCase() !== swatch.toUpperCase()
                        ? colors.outlineVariant
                        : colors.primary,
                    opacity: pressed ? 0.7 : 1,
                    transform: [
                      {
                        scale:
                          value.toUpperCase() === swatch.toUpperCase()
                            ? 1.08
                            : 1,
                      },
                    ],
                  })}
                />
              ))}
            </View>
          </View>

          <AppText role="bodySmall" style={{color: colors.outline}}>
            RGB {red}, {green}, {blue}
          </AppText>
        </View>
      ) : null}
    </View>
  );
};

export default ColorField;
