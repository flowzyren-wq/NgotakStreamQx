import React, {useMemo, useRef, useState} from 'react';
import {
  Keyboard,
  RefreshControl,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {useQuery} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import AmbientBackground from '../../components/ui/AmbientBackground';
import Text from '../../components/ui/Text';
import Button from '../../components/ui/Button';
import SearchField, {SearchFieldRef} from '../../components/ui/SearchField';
import {useM3Colors} from '../../theme/M3PaletteContext';
import {
  clearAccessSignature,
  formatDeviceCode,
  getDeviceCode,
  hasAdultAccess,
  storeAccessSignature,
} from '../../lib/adult/access';
import {
  getAdultFeed,
  resetRegistryCache,
  resolveAdultStreams,
  searchAdult,
} from '../../lib/adult/service';
import type {AdultCard, AdultStream} from '../../lib/adult/types';
import AdultLockedPanel from './AdultLockedPanel';
import AdultBrowse from './AdultBrowse';
import AdultSearchPanel from './AdultSearchPanel';
import type {HomeStackParamList} from '../../App';

type Props = NativeStackScreenProps<HomeStackParamList, 'AdultSection'>;

function pickBest(streams: AdultStream[]): AdultStream {
  const hls = streams.find(stream => stream.type === 'm3u8');
  if (hls) {
    return hls;
  }
  const withHeight = streams.filter(stream => typeof stream.height === 'number');
  if (!withHeight.length) {
    return streams[0];
  }
  return withHeight.reduce((best, stream) =>
    (best.height ?? 0) > (stream.height ?? 0) ? best : stream,
  );
}

const AdultSection = React.memo(({navigation}: Props) => {
  const colors = useM3Colors();
  const deviceCode = useMemo(() => formatDeviceCode(getDeviceCode()), []);
  const [unlocked, setUnlocked] = useState(() => hasAdultAccess());
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [mode, setMode] = useState<'browse' | 'search'>('browse');
  const inputRef = useRef<SearchFieldRef>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<AdultCard[]>([]);
  const [searchedTerm, setSearchedTerm] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [resolvingUrl, setResolvingUrl] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);

  const feed = useQuery({
    queryKey: ['adultFeed'],
    queryFn: getAdultFeed,
    enabled: unlocked,
    staleTime: 300000,
    retry: 1,
  });

  const enterSearch = () => {
    setMode('search');
    setPlayError(null);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const exitSearch = () => {
    Keyboard.dismiss();
    setMode('browse');
    setQuery('');
    setResults([]);
    setSearchedTerm(null);
    setSearchError(null);
    setPlayError(null);
  };

  const runSearch = async () => {
    const term = query.trim();
    if (searching || !term) {
      return;
    }
    Keyboard.dismiss();
    setSearching(true);
    setSearchError(null);
    setPlayError(null);
    setResolvingUrl(null);
    try {
      const found = await searchAdult(term);
      setResults(found);
      setSearchedTerm(term);
      if (found.length === 0) {
        setSearchError('Tidak ada hasil. Coba kata kunci lain.');
      }
    } catch {
      setSearchError('Gagal mengambil hasil. Periksa koneksi lalu coba lagi.');
      setResults([]);
      setSearchedTerm(term);
    } finally {
      setSearching(false);
    }
  };

  const verify = () => {
    if (checking) {
      return;
    }
    setKeyError(null);
    const key = keyInput.trim();
    if (!key) {
      setKeyError('Masukkan key dulu.');
      return;
    }
    setChecking(true);
    if (!storeAccessSignature(key)) {
      setKeyError(
        'Key tidak cocok dengan perangkat ini. Minta key baru ke developer.',
      );
    } else {
      setUnlocked(true);
      setKeyInput('');
      setKeyError(null);
      setMode('browse');
    }
    setChecking(false);
  };

  const onChangeKey = (value: string) => {
    setKeyInput(value);
    if (keyError) {
      setKeyError(null);
    }
  };

  const play = async (card: AdultCard) => {
    if (resolvingUrl) {
      return;
    }
    setPlayError(null);
    setResolvingUrl(card.url);
    try {
      const streams = await resolveAdultStreams(card);
      if (!streams.length) {
        setPlayError('Sumber tidak ditemukan / gagal dimuat. Coba judul lain.');
        return;
      }
      const best = pickBest(streams);
      const parent = navigation.getParent();
      if (parent != null) {
        parent.navigate('Player', {
          linkIndex: 0,
          episodeList: [{id: 'adult-1', title: card.title, link: best.url}],
          directUrl: best.url,
          directUrlServer: best.server,
          directUrlHeaders: best.headers,
          type: '',
          primaryTitle: card.title,
          poster: {poster: card.thumb},
          providerValue: card.siteId,
          infoUrl: card.url,
        });
      }
    } catch {
      setPlayError('Gagal memuat sumber. Periksa koneksi lalu coba lagi.');
    } finally {
      setResolvingUrl(null);
    }
  };

  const revoke = () => {
    clearAccessSignature();
    resetRegistryCache();
    setUnlocked(false);
    setKeyInput('');
    setKeyError(null);
    setMode('browse');
    setQuery('');
    setResults([]);
    setSearchedTerm(null);
    setSearchError(null);
    setPlayError(null);
  };

  const playErrorBox = playError ? (
    <View
      className="mx-4 mt-3 rounded-xl px-4 py-3"
      style={{
        borderWidth: 1,
        borderColor: colors.errorContainer,
        backgroundColor: colors.errorContainer,
      }}>
      <Text role="bodyMedium" style={{color: colors.onErrorContainer}}>
        {playError}
      </Text>
    </View>
  ) : null;

  return (
    <AmbientBackground>
      <StatusBar barStyle="light-content" />
      <GestureHandlerRootView style={{flex: 1}}>
        <View className="flex-1">
          {mode !== 'search' ? (
            <View
              className="flex-row items-center px-4"
              style={{paddingTop: 48, paddingBottom: 8}}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                hitSlop={12}
                className="p-2 mr-1">
                <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
              </TouchableOpacity>
              <Text
                role="titleLargeEmphasized"
                style={{color: colors.onSurface, flex: 1}}>
                Hentai
              </Text>
              {unlocked ? (
                <TouchableOpacity
                  onPress={enterSearch}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Cari judul"
                  className="p-2">
                  <Ionicons name="search" size={22} color={colors.onSurface} />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View
              className="flex-row items-center px-4"
              style={{paddingTop: 48, paddingBottom: 12}}>
              <View className="flex-1 mr-2">
                <SearchField
                  ref={inputRef}
                  value={query}
                  onChangeText={setQuery}
                  onSubmit={runSearch}
                  placeholder="Cari judul..."
                />
              </View>
              <Button variant="text" compact onPress={exitSearch}>
                Batal
              </Button>
            </View>
          )}

          {!unlocked ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{paddingBottom: 120}}>
              <AdultLockedPanel
                deviceCode={deviceCode}
                keyInput={keyInput}
                onChangeKey={onChangeKey}
                onVerify={verify}
                checking={checking}
                error={keyError}
              />
            </ScrollView>
          ) : mode !== 'browse' ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{paddingBottom: 120}}>
              <AdultSearchPanel
                searching={searching}
                error={searchError}
                results={results}
                searchedTerm={searchedTerm}
                resolvingUrl={resolvingUrl}
                onPlay={play}
              />
              {playErrorBox}
            </ScrollView>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{paddingBottom: 120}}
              refreshControl={
                <RefreshControl
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                  progressBackgroundColor={colors.surfaceContainer}
                  refreshing={feed.isRefetching}
                  onRefresh={() => feed.refetch()}
                />
              }>
              <AdultBrowse
                rails={feed.data ?? []}
                isLoading={feed.isLoading}
                hasError={!!feed.error}
                resolvingUrl={resolvingUrl}
                onPlay={play}
              />
              {playErrorBox}
              <TouchableOpacity
                onPress={revoke}
                className="self-center mt-6 mb-2 p-2">
                <Text
                  role="bodySmall"
                  style={{color: colors.error, textDecorationLine: 'underline'}}>
                  Batalkan akses di perangkat ini
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </GestureHandlerRootView>
    </AmbientBackground>
  );
});

export default AdultSection;
