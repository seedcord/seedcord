export * from './client';

export { DocsEngine, type DocsEngineOptions } from './DocsEngine';
export { ManifestReader, type ManifestReaderOptions } from './ManifestReader';
export { resolveGeneratedDir, resolveManifestPath, MANIFEST_FILENAME } from './constants';
export { kindLabel, kindKey, kindName } from './kinds';
export { PackageDirectory, type DirectoryEntity, type DirectorySnapshot } from './PackageDirectory';
export {
    formatInlineTypePretty,
    formatRenderedDeclarationHeaderPretty,
    formatRenderedSignaturePretty,
    formatTypeParameterPretty,
    type FormattedOutput,
    type RefRange,
    type ResolveHref,
    type TypeParameter
} from './transformers/pretty-formatter';
export * from './routing/reference-resolver';
export * from './lookup/find-entity';

export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
