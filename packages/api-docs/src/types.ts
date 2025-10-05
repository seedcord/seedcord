// allow packages to add a lil bit of config inside their package.json under seedcordDocs
export interface SeedcordDocsConfig {
  entryPoints?: string[];
  tsconfig?: string;
}

// the exact bits of package.json we care about when generating docs
export interface PackageManifest {
  name: string;
  version: string;
  private?: boolean;
  types?: string;
  seedcordDocs?: SeedcordDocsConfig;
}

// typedoc run summary we use for console output and manifest writing
export interface PackageDocResult {
  name: string;
  version: string;
  entryPoints: string[];
  outputPath: string | null;
  warnings: string[];
  errors: string[];
  succeeded: boolean;
}
