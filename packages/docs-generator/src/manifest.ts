import { writeFile } from 'node:fs/promises';

import { Extractor } from '@microsoft/api-extractor';

import { defaultPaths } from './paths';

import type { ApiDocsPaths } from './paths';
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
        ...(repository ? { repository } : {}),
        packages: results.map((result) => ({
            name: result.name,
            version: result.version,
            entryPoints: result.entryPoints,
            output: result.outputPath ? paths.toRepoRelative(result.outputPath) : null,
            warningCount: result.warnings.length,
            errorCount: result.errors.length,
            warnings: result.warnings,
            errors: result.errors,
            succeeded: result.succeeded,
            ...(result.sources ? { sources: result.sources } : {}),
            ...(result.reexports ? { reexports: result.reexports } : {})
        }))
    };

    await writeFile(paths.manifestPath, JSON.stringify(payload, null, 2), 'utf8');
}
