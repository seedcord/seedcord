/**
 * Per-package doc config under `seedcordDocs` in package.json.
 */
export interface SeedcordDocsConfig {
    /** Keeps a published package out of the docs */
    skip?: boolean;
}

/** One `exports` condition, nested to whatever depth the manifest wrote it. */
export type ExportCondition = string | { [condition: string]: ExportCondition | undefined };

export interface PackageManifest {
    name: string;
    version: string;
    private?: boolean;
    description?: string;
    types?: string;
    dependencies?: Record<string, string>;
    seedcordDocs?: SeedcordDocsConfig;
    exports?: Record<string, ExportCondition>;
}

/** One documented import path, `.` for the package root and `./hmr` for a subpath. */
export interface DocEntryPoint {
    subpath: string;
    /** Absolute path to the built declaration api-extractor reads. */
    declaration: string;
    /** Package-relative path to the `src` file the source pass walks. */
    sourceEntry?: string;
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

/** One extracted import path and the model api-extractor wrote for it. */
export interface EntryDocResult {
    subpath: string;
    /** Package-relative declaration api-extractor read. */
    entryPoint: string;
    /** Package-relative `src` file the source pass walked. */
    sourceEntry?: string;
    outputPath: string | null;
    warnings: string[];
    errors: string[];
    succeeded: boolean;
}

/**
 * API Extractor run summary for one package.
 */
export interface PackageDocResult {
    name: string;
    version: string;
    entries: EntryDocResult[];
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
