module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: [
    './node_modules/react-native-mmkv-storage/jest/mmkvJestSetup.js',
    './node_modules/react-native-gesture-handler/jestSetup.js',
    '<rootDir>/jest.setup.js',
  ],
  // Paket Expo & beberapa lib RN dikirim sebagai ESM; biarkan Babel mentransformnya.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-.*|@expo/.*|react-native-.*|@react-navigation/.*|@himanshu8443/.*|@dr.pogodin/.*|@shopify/.*|@gorhom/.*|@notifee/.*|@legendapp/.*|nativewind|react-native-css-interop)/)',
  ],
  moduleNameMapper: {
    '\\.(css|ttf|otf)$': '<rootDir>/__mocks__/fileMock.js',
    '^@expo/ui/jetpack-compose$':
      '<rootDir>/__mocks__/expo-ui-jetpack-compose.js',
    '^@expo/ui/jetpack-compose/modifiers$':
      '<rootDir>/__mocks__/expo-ui-jetpack-compose-modifiers.js',
  },
};
