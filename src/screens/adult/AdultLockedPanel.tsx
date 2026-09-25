import React from 'react';
import {Image, TextInput, View} from 'react-native';
import Button from '../../components/ui/Button';
import Text from '../../components/ui/Text';
import Surface from '../../components/ui/Surface';
import {useM3Colors} from '../../theme/M3PaletteContext';

type Props = {
  deviceCode: string;
  keyInput: string;
  onChangeKey: (value: string) => void;
  onVerify: () => void;
  checking: boolean;
  error?: string | null;
};

const AdultLockedPanel = ({
  deviceCode,
  keyInput,
  onChangeKey,
  onVerify,
  checking,
  error,
}: Props) => {
  const colors = useM3Colors();

  return (
    <View style={{alignItems: 'center', paddingHorizontal: 24, paddingTop: 36}}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.surfaceContainerHighest,
          borderRadius: 999,
          height: 76,
          justifyContent: 'center',
          width: 76,
        }}>
        <Image
          source={require('../../../assets/hentai_icon.png')}
          resizeMode="contain"
          style={{height: 40, width: 40}}
        />
      </View>
      <Text
        role="titleLargeEmphasized"
        style={{color: colors.onSurface, marginTop: 18, textAlign: 'center'}}>
        Bagian ini terkunci
      </Text>
      <Text
        role="bodyMedium"
        style={{
          color: colors.onSurfaceVariant,
          marginTop: 8,
          textAlign: 'center',
        }}>
        Minta key akses ke developer. Key terikat ke perangkat ini saja dan
        tidak bisa dipakai di HP lain.
      </Text>

      <Surface level="low" className="rounded-2xl self-stretch mt-6 p-4">
        <Text
          role="labelLarge"
          style={{color: colors.onSurfaceVariant, marginBottom: 6}}>
          Kode perangkat
        </Text>
        <Text
          selectable
          style={{
            color: colors.onSurface,
            fontSize: 18,
            fontWeight: '700',
            letterSpacing: 2,
          }}>
          {deviceCode}
        </Text>
        <Text
          role="bodySmall"
          style={{color: colors.onSurfaceVariant, marginTop: 6}}>
          Kirim kode ini ke developer untuk menerima key. Tekan lama untuk
          menyalin.
        </Text>
      </Surface>

      <View
        className="flex-row items-center self-stretch mt-4"
        style={{gap: 10}}>
        <View
          className="flex-1 rounded-xl px-3"
          style={{
            borderWidth: 1,
            borderColor: error ? colors.error : colors.outlineVariant,
            backgroundColor: colors.surfaceContainerLow,
          }}>
          <TextInput
            value={keyInput}
            onChangeText={onChangeKey}
            onSubmitEditing={onVerify}
            placeholder="Tempel key di sini"
            placeholderTextColor={colors.outline}
            autoCapitalize="none"
            autoCorrect={false}
            style={{color: colors.onSurface, paddingVertical: 11, fontSize: 14}}
          />
        </View>
        <Button variant="filled" onPress={onVerify} disabled={checking}>
          {checking ? '...' : 'Verifikasi'}
        </Button>
      </View>

      {error ? (
        <Text
          role="bodyMedium"
          style={{color: colors.error, marginTop: 10, textAlign: 'center'}}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

export default AdultLockedPanel;
