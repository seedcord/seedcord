import fs from 'node:fs/promises';

import { resolveManifestPath } from '@src/constants';

import type { DocManifest, DocManifestPackage, PackageSourceIndex } from '@src/types';

export interface ManifestReaderOptions {
    rootDir?: string;
    manifestPath?: string;
}

export class ManifestReader {
    private readonly manifestPath: string;

    constructor(options: ManifestReaderOptions = {}) {
        this.manifestPath = resolveManifestPath(options.rootDir, options.manifestPath);
    }

    async read(): Promise<DocManifest> {
        const raw = await fs.readFile(this.manifestPath, 'utf8');
        const parsed = JSON.parse(raw) as Partial<DocManifest>;

        const repository = parseRepository(parsed.repository);
        const packages = Array.isArray(parsed.packages)
            ? parsed.packages
                  .map((pkg) => normalizePackage(pkg))
                  .filter((pkg): pkg is DocManifestPackage => pkg !== null)
            : [];

        const manifest: DocManifest = {
            generatedAt: parsed.generatedAt ?? '',
            tool: parsed.tool ?? '',
            apiExtractorVersion: parsed.apiExtractorVersion ?? '',
            outputDir: parsed.outputDir ?? '',
            packages
        };

        if (repository) {
            manifest.repository = repository;
        }

        return manifest;
    }
}

function normalizePackage(value: unknown): DocManifestPackage | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const pkg = value as Partial<DocManifestPackage> & {
        entryPoints?: unknown;
        warnings?: unknown;
        errors?: unknown;
    };

    const name = typeof pkg.name === 'string' ? pkg.name : '';
    const version = typeof pkg.version === 'string' ? pkg.version : '';
    if (name.length === 0) {
        return null;
    }

    const entryPoints = Array.isArray(pkg.entryPoints)
        ? pkg.entryPoints.map((entry) => String(entry)).filter((entry) => entry.length > 0)
        : [];

    const warnings = Array.isArray(pkg.warnings) ? pkg.warnings.map((warning) => String(warning)) : [];
    const errors = Array.isArray(pkg.errors) ? pkg.errors.map((error) => String(error)) : [];

    const warningCount = typeof pkg.warningCount === 'number' ? pkg.warningCount : warnings.length;
    const errorCount = typeof pkg.errorCount === 'number' ? pkg.errorCount : errors.length;

    const result: DocManifestPackage = {
        name,
        version,
        entryPoints,
        output: typeof pkg.output === 'string' ? pkg.output : null,
        warnings,
        errors,
        warningCount,
        errorCount,
        succeeded: Boolean(pkg.succeeded)
    };

    // `sources` + `reexports` come from the generator and are accepted with a shallow shape check, not
    // re-validated per entry.
    if (isRecordShape(pkg.sources)) result.sources = pkg.sources;
    if (Array.isArray(pkg.reexports)) result.reexports = pkg.reexports;
    if (typeof pkg.readme === 'string') result.readme = pkg.readme;

    return result;
}

function isRecordShape(value: PackageSourceIndex | undefined): value is PackageSourceIndex {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseRepository(value: unknown): DocManifest['repository'] | undefined {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const repo = value as {
        url?: unknown;
        branch?: unknown;
        commit?: unknown;
    };

    const url = typeof repo.url === 'string' && repo.url.length > 0 ? repo.url : undefined;
    if (!url) {
        return undefined;
    }

    const result: NonNullable<DocManifest['repository']> = { url };

    if (typeof repo.branch === 'string' && repo.branch.length > 0) {
        result.branch = repo.branch;
    }

    if (typeof repo.commit === 'string' && repo.commit.length > 0) {
        result.commit = repo.commit;
    }

    return result;
}
