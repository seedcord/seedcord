export * from '@src/client';

export { DocsEngine, type DocsEngineOptions } from '@src/DocsEngine';
export { ManifestReader, type ManifestReaderOptions } from '@src/ManifestReader';
export { resolveGeneratedDir, resolveManifestPath, MANIFEST_FILENAME } from '@src/constants';
export { kindLabel, kindKey, kindName } from '@src/kinds';
export { PackageDirectory, type DirectoryEntity, type DirectorySnapshot } from '@src/PackageDirectory';
export {
    formatInlineTypePretty,
    formatRenderedDeclarationHeaderPretty,
    formatRenderedSignaturePretty,
    formatTypeParameterPretty,
    type FormattedOutput,
    type RefRange,
    type ResolveHref,
    type TypeParameter
} from '@transformers/pretty-formatter';
export * from '@routing/reference-resolver';
export * from '@lookup/find-entity';

export { VersionedDocsEngine, type ReferenceResolution } from '@remote/VersionedDocsEngine';
export { IndexLoader, type Fetcher, type ResolvedVersion } from '@remote/index-loader';
export { ProjectLoader } from '@remote/project-loader';
export { serializeProject, deserializeProject, validateProjectFile, type DocProjectFile } from '@remote/project-file';
export { validateIndex, type IndexJson, type PackageIndexEntry, type StableChannel } from '@remote/index-json';
export { IndexFetchError, ProjectFetchError, PackageVersionNotFoundError } from '@remote/errors';

export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
