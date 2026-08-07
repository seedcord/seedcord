/**
 * Per-package doc config under `seedcordDocs` in package.json.
 */
export interface SeedcordDocsConfig {
    entryPoints?: string[];
    /** Keeps a published package out of the docs */
    skip?: boolean;
}

export interface PackageManifest {
    name: string;
    version: string;
    private?: boolean;
    description?: string;
    types?: string;
    dependencies?: Record<string, string>;
    seedcordDocs?: SeedcordDocsConfig;
}

export interface SourceEntry {
    /** Repo-relative path to the declaring `src/*.ts`. */
    file: string;
    line: number;
    column: number;
    /** GitHub blob URL with the `#L<line>C<column>` anchor, absent when no repo base was supplied. */
    url?: string;
}

/** Dotted qualified name (`Class.member`) to per-declaration source positions, one entry per overload. */
export type PackageSourceIndex = Record<string, SourceEntry[]>;

/** A symbol the package re-exports from a workspace dependency (`export * from '@seedcord/x'`). */
export interface ReexportEntry {
    /** Exported name as it appears on this package's surface. */
    name: string;
    /** Full name of the package that declares it, e.g. `@seedcord/logger`. */
    owner: string;
}

/** Result of the source scan: own-source positions plus the workspace symbols this package re-exports. */
export interface SourceScan {
    sources: PackageSourceIndex;
    reexports: ReexportEntry[];
}

/** GitHub repo the source links point at, written into the manifest. */
export interface ManifestRepository {
    url: string;
    branch?: string;
    commit?: string;
}

/**
 * API Extractor run summary for one package.
 */
export interface PackageDocResult {
    name: string;
    version: string;
    entryPoints: string[];
    /** Primary `src` entry (relative to the package dir) the source pass walks. this matches AE's entry. */
    sourceEntry?: string;
    outputPath: string | null;
    warnings: string[];
    errors: string[];
    succeeded: boolean;
    sources?: PackageSourceIndex;
    reexports?: ReexportEntry[];
    readme?: string;
    changelogUrl?: string;
    description?: string;
}
