import { mkdir } from 'node:fs/promises';

import { extractPackageDocs } from './extractor';
import { writeManifest } from './manifest';
import { OUTPUT_DIR, toRepoRelative } from './paths';
import { discoverWorkspacePackages } from './workspace';

import type { PackageDocResult } from './types';

// create the output folder, run typedoc for each package, then the manifest at the end
async function run(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const packageDirs = await discoverWorkspacePackages();
  const results: PackageDocResult[] = [];

  for (const packageDir of packageDirs) {
    const result = await extractPackageDocs(packageDir);
    if (!result) continue;

    results.push(result);

    const statusIcon = result.succeeded ? '✅' : '❌';
    const outputSummary = result.outputPath ? `→ ${toRepoRelative(result.outputPath)}` : '→ —';
    const warningSummary = result.warnings.length > 0 ? ` ⚠️ ${result.warnings.length}` : '';
    console.log(`${statusIcon} ${result.name}@${result.version} ${outputSummary}${warningSummary}`);

    if (!result.succeeded) {
      throw new Error(`TypeDoc extraction failed for ${result.name}. see logs above.`);
    }
  }

  await writeManifest(results);

  console.log(`\nGenerated ${results.length} API documents → ${toRepoRelative(OUTPUT_DIR)}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
