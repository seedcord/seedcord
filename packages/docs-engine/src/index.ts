export { DocsEngine, type DocsEngineOptions } from './engine';
export { ManifestReader, type ManifestReaderOptions } from './manifest-reader';
export { resolveGeneratedDir, resolveManifestPath, MANIFEST_FILENAME } from './constants';
export * from './slugger';
export { kindLabel, kindKey, kindName } from './kinds';
export { PackageDirectory, type DirectoryEntity, type DirectorySnapshot } from './directory';
export { DEFAULT_SEARCH_TARGETS } from './search-targets';
export type * from './types';

export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
