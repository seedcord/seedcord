/**
 * Allow packages to add a lil bit of config inside their package.json under seedcordDocs
 */
export interface SeedcordDocsConfig {
    entryPoints?: string[];
    tsconfig?: string;
}

/**
 * The exact bits of package.json important when generating docs
 */
export interface PackageManifest {
    name: string;
    version: string;
    private?: boolean;
    types?: string;
    seedcordDocs?: SeedcordDocsConfig;
}

/**
 * Typedoc run summary
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
