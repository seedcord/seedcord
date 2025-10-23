import { writeFile } from 'node:fs/promises';

import { Application } from 'typedoc';

import { defaultPaths } from './paths';

import type { ApiDocsPaths } from './paths';
import type { PackageDocResult } from './types';

export async function writeManifest(results: PackageDocResult[], paths: ApiDocsPaths = defaultPaths): Promise<void> {
    const payload = {
        generatedAt: new Date().toISOString(),
        tool: 'typedoc',
        typedocVersion: Application.VERSION,
        outputDir: paths.toRepoRelative(paths.outputDir),
        packages: results.map((result) => ({
            name: result.name,
            version: result.version,
            entryPoints: result.entryPoints,
            output: result.outputPath ? paths.toRepoRelative(result.outputPath) : null,
            warningCount: result.warnings.length,
            errorCount: result.errors.length,
            warnings: result.warnings,
            errors: result.errors,
            succeeded: result.succeeded
        }))
    };

    await writeFile(paths.manifestPath, JSON.stringify(payload, null, 2), 'utf8');
}
