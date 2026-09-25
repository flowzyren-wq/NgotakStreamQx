/* global jest */
// Mock default react-native-fs untuk Jest (modul native tidak tersedia).
// Test yang butuh perilaku khusus tetap bisa override dengan jest.mock().
const resolved = value => jest.fn(() => Promise.resolve(value));

module.exports = {
  CachesDirectoryPath: '/cache',
  DocumentDirectoryPath: '/documents',
  DownloadDirectoryPath: '/downloads',
  ExternalDirectoryPath: '/external',
  ExternalStorageDirectoryPath: '/storage',
  TemporaryDirectoryPath: '/tmp',
  exists: resolved(false),
  mkdir: resolved(undefined),
  readDir: resolved([]),
  readFile: resolved(''),
  writeFile: resolved(undefined),
  appendFile: resolved(undefined),
  unlink: resolved(undefined),
  moveFile: resolved(undefined),
  copyFile: resolved(undefined),
  stat: resolved({size: 0, isFile: () => true, isDirectory: () => false}),
  getFSInfo: resolved({freeSpace: 0, totalSpace: 0}),
  scanFile: resolved([]),
};
