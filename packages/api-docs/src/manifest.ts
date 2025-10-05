import { writeFile } from 'node:fs/promises';

import { Application } from 'typedoc';

import { MANIFEST_PATH, OUTPUT_DIR, toRepoRelative } from './paths';

import type { PackageDocResult } from './types';

/**
 * stash a summary json so we can peek at what happened without reading console spam
 */
export async function writeManifest(results: PackageDocResult[]): Promise<void> {
  const payload = {
    generatedAt: new Date().toISOString(),
    tool: 'typedoc',
    typedocVersion: Application.VERSION,
    outputDir: toRepoRelative(OUTPUT_DIR),
    packages: results.map((result) => ({
      name: result.name,
      version: result.version,
      entryPoints: result.entryPoints,
      output: result.outputPath ? toRepoRelative(result.outputPath) : null,
      warningCount: result.warnings.length,
      errorCount: result.errors.length,
      warnings: result.warnings,
      errors: result.errors,
      succeeded: result.succeeded
    }))
  };

  await writeFile(MANIFEST_PATH, JSON.stringify(payload, null, 2), 'utf8');
}
