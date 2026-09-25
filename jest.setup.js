/* global jest, globalThis */
// Global Expo (EventEmitter/NativeModule/SharedObject) seperti yang dipasang
// jest-expo, supaya paket expo-* bisa di-import di Jest.
require('expo-modules-core/src/polyfill/dangerous-internal').installExpoGlobalPolyfill();

// Modul native Expo apa pun (ExpoFontLoader, ExpoApplication, dst.) diganti
// objek mock generik (konstanta = undefined, listener = no-op). Method yang
// dibutuhkan test bisa ditambahkan lewat NATIVE_MODULE_OVERRIDES.
const NATIVE_MODULE_OVERRIDES = {
  ExpoFontLoader: {
    getLoadedFonts: jest.fn(() => []),
    loadAsync: jest.fn(() => Promise.resolve()),
  },
  ExpoApplication: {
    applicationId: 'id.qxshaa.ngotakstreamqx.test',
    applicationName: 'NgotakStream Qx',
    nativeApplicationVersion: '1.0.3',
    nativeBuildVersion: '193',
  },
};
const createNativeModuleMock = name => {
  const target = {
    __name: name,
    addListener: jest.fn(() => ({remove: jest.fn()})),
    removeListeners: jest.fn(),
    removeAllListeners: jest.fn(),
    emit: jest.fn(),
    ...(NATIVE_MODULE_OVERRIDES[name] || {}),
  };
  // Properti PascalCase (mis. FileSystem.FileSystemFile) adalah kelas native
  // yang di-extend saat import; sediakan kelas kosong. Sisanya undefined.
  return new Proxy(target, {
    get(obj, prop) {
      if (
        !(prop in obj) &&
        typeof prop === 'string' &&
        /^[A-Z][a-z]/.test(prop)
      ) {
        obj[prop] = class {};
      }
      return obj[prop];
    },
  });
};
globalThis.expo.modules = new Proxy(
  {},
  {
    get(cache, name) {
      if (typeof name === 'symbol') {
        return undefined;
      }
      if (!(name in cache)) {
        cache[name] = createNativeModuleMock(name);
      }
      return cache[name];
    },
  },
);

// Penyimpanan MMKV in-memory supaya modul yang membuat instance MMKV saat
// di-import tidak crash di Jest (binding native tidak tersedia).
require('react-native-mmkv-storage/jest/dist/jest/memoryStore.js').mock();

// Reanimated / Worklets butuh JSI native; pakai mock resmi masing-masing.
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/lib/module/mock'),
);
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

// Side-effect runtime Expo (polyfill fetch/URL "winter", dev message socket)
// tidak relevan di Node dan butuh modul native.
jest.mock('expo/src/Expo.fx', () => ({}));

// Font ikon dianggap sudah termuat (tidak ada expo-asset native di Jest).
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(() => Promise.resolve()),
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: {trigger: jest.fn()},
  trigger: jest.fn(),
}));

jest.mock('@notifee/react-native', () =>
  require('@notifee/react-native/jest-mock'),
);

// TurboModule native pihak ketiga (WebView, dll.) yang tidak punya mock resmi:
// kembalikan modul generik yang semua method-nya jest.fn().
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => {
  const actual = jest.requireActual(
    'react-native/Libraries/TurboModule/TurboModuleRegistry',
  );
  const cache = {};
  const genericModule = name =>
    new Proxy(
      {getConstants: () => ({})},
      {
        get(obj, prop) {
          if (typeof prop === 'symbol' || prop === 'then') {
            return undefined;
          }
          if (!(prop in obj)) {
            obj[prop] = jest.fn();
          }
          return obj[prop];
        },
      },
    );
  const get = name => {
    const real = actual.get(name);
    if (real) {
      return real;
    }
    cache[name] = cache[name] || genericModule(name);
    return cache[name];
  };
  return {...actual, get, getEnforcing: get};
});

jest.mock('react-native-orientation-locker', () => ({
  __esModule: true,
  default: {
    lockToPortrait: jest.fn(),
    lockToLandscape: jest.fn(),
    lockToLandscapeLeft: jest.fn(),
    lockToLandscapeRight: jest.fn(),
    unlockAllOrientations: jest.fn(),
    getOrientation: jest.fn(),
    getDeviceOrientation: jest.fn(),
    addOrientationListener: jest.fn(),
    removeOrientationListener: jest.fn(),
    addDeviceOrientationListener: jest.fn(),
    removeDeviceOrientationListener: jest.fn(),
    addLockListener: jest.fn(),
    removeLockListener: jest.fn(),
  },
  OrientationType: {},
}));

// Komponen pemutar video (butuh modul native volume/brightness/video).
jest.mock('@8man/react-native-media-console', () => {
  const React = require('react');
  const {View} = require('react-native');
  const VideoPlayer = React.forwardRef((props, ref) =>
    React.createElement(View, {ref, testID: props.testID}),
  );
  return {__esModule: true, default: VideoPlayer};
});
