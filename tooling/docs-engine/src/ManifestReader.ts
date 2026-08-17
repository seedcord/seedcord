import fs from 'node:fs/promises';

import { resolveManifestPath } from '#src/constants';

import type { DocManifest, DocManifestEntry, DocManifestPackage, PackageSourceIndex } from '#src/types';

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
    if (name.length === 0) {
        return null;
    }

    const version = typeof pkg.version === 'string' ? pkg.version : '';

    const entryPoints = Array.isArray(pkg.entryPoints)
        ? pkg.entryPoints.map(String).filter((entry) => entry.length > 0)
        : [];

    const warnings = Array.isArray(pkg.warnings) ? pkg.warnings.map(String) : [];
    const errors = Array.isArray(pkg.errors) ? pkg.errors.map(String) : [];

    const warningCount = typeof pkg.warningCount === 'number' ? pkg.warningCount : warnings.length;
    const errorCount = typeof pkg.errorCount === 'number' ? pkg.errorCount : errors.length;

    const result: DocManifestPackage = {
        name,
        version,
        entryPoints,
        entries: normalizeEntries(pkg.entries),
        output: typeof pkg.output === 'string' ? pkg.output : null,
        ...(typeof pkg.sharedModel === 'string' && { sharedModel: pkg.sharedModel }),
        warnings,
        errors,
        warningCount,
        errorCount,
        succeeded: Boolean(pkg.succeeded)
    };

    attachOptionalFields(result, pkg);

    return result;
}

function normalizeEntries(value: unknown): DocManifestEntry[] {
    if (!Array.isArray(value)) return [];

    return value.reduce<DocManifestEntry[]>((acc, raw) => {
        if (!raw || typeof raw !== 'object') return acc;
        const entry = raw as Partial<DocManifestEntry>;
        if (typeof entry.subpath !== 'string' || entry.subpath.length === 0) return acc;

        acc.push({
            subpath: entry.subpath,
            output: typeof entry.output === 'string' ? entry.output : null
        });
        return acc;
    }, []);
}

function attachOptionalFields(result: DocManifestPackage, pkg: Partial<DocManifestPackage>): void {
    if (isRecordShape(pkg.sources)) result.sources = pkg.sources;
    if (Array.isArray(pkg.reexports)) result.reexports = pkg.reexports;
    if (typeof pkg.readme === 'string') result.readme = pkg.readme;
    if (typeof pkg.changelogUrl === 'string') result.changelogUrl = pkg.changelogUrl;
    if (typeof pkg.description === 'string') result.description = pkg.description;
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
