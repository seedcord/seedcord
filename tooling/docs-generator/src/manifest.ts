import { writeFile } from 'node:fs/promises';

import { Extractor } from '@microsoft/api-extractor';

import { defaultPaths } from './ApiDocsPaths';
import { pageFields } from './manifest-fields';

import type { ApiDocsPaths } from './ApiDocsPaths';
import type { ManifestRepository, PackageDocResult } from './types';

export async function writeManifest(
    results: PackageDocResult[],
    paths: ApiDocsPaths = defaultPaths,
    repository?: ManifestRepository
): Promise<void> {
    const payload = {
        generatedAt: new Date().toISOString(),
        tool: 'api-extractor',
        apiExtractorVersion: Extractor.version,
        outputDir: paths.toRepoRelative(paths.outputDir),
        ...(repository && { repository }),
        packages: results.map((result) => ({
            name: result.name,
            version: result.version,
            entryPoints: result.entryPoints,
            entries: result.entries.map((entry) => ({
                subpath: entry.subpath,
                output: entry.outputPath ? paths.toRepoRelative(entry.outputPath) : null
            })),
            output: result.outputPath ? paths.toRepoRelative(result.outputPath) : null,
            ...(result.sharedModelPath && { sharedModel: paths.toRepoRelative(result.sharedModelPath) }),
            warningCount: result.warnings.length,
            errorCount: result.errors.length,
            warnings: result.warnings,
            errors: result.errors,
            succeeded: result.succeeded,
            ...(result.sources && { sources: result.sources }),
            ...(result.reexports && { reexports: result.reexports }),
            ...pageFields(result)
        }))
    };

    await writeFile(paths.manifestPath, JSON.stringify(payload, null, 2), 'utf8');
}
