/**
 * Per-package doc config under `seedcordDocs` in package.json.
 */
export interface SeedcordDocsConfig {
    entryPoints?: string[];
}

export interface PackageManifest {
    name: string;
    version: string;
    private?: boolean;
    types?: string;
    dependencies?: Record<string, string>;
    seedcordDocs?: SeedcordDocsConfig;
}

/**
 * API Extractor run summary for one package.
 */
export interface PackageDocResult {
    name: string;
    version: string;
    entryPoints: string[];
    outputPath: string | null;
    warnings: string[];
    errors: string[];
    succeeded: boolean;
}
