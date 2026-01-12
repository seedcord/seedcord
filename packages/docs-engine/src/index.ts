export { DocsEngine, type DocsEngineOptions } from './DocsEngine';
export { ManifestReader, type ManifestReaderOptions } from './ManifestReader';
export { resolveGeneratedDir, resolveManifestPath, MANIFEST_FILENAME } from './constants';
export * from './Slugger';
export { kindLabel, kindKey, kindName } from './kinds';
export { PackageDirectory, type DirectoryEntity, type DirectorySnapshot } from './PackageDirectory';
export { DEFAULT_SEARCH_TARGETS } from './search-targets';
export type * from './types';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
