import { rm } from 'node:fs/promises';

import { Application, EntryPointStrategy, LogLevel } from 'typedoc';

import { getOutputPathForPackage, toRepoRelative } from './paths';
import { pathExists, stripAnsi } from './utils';
import { readPackageManifest, resolveEntryPoints, resolveTsconfigPath } from './workspace';

import type { PackageDocResult } from './types';

/**
 * run typedoc for one package and collect the status, warnings, and output location
 */
// eslint-disable-next-line max-statements
export async function extractPackageDocs(packageDir: string): Promise<PackageDocResult | null> {
  const manifest = await readPackageManifest(packageDir);
  if (manifest.private) return null;

  const { absolute: entryPoints, relative: relativeEntryPoints } = await resolveEntryPoints(packageDir, manifest);
  if (entryPoints.length === 0) {
    console.warn(`⚠️  Skipping ${manifest.name}: no entry points found`);
    return null;
  }

  const tsconfigPath = resolveTsconfigPath(packageDir, manifest);
  if (!(await pathExists(tsconfigPath))) {
    console.warn(`⚠️  Skipping ${manifest.name}: tsconfig not found at ${toRepoRelative(tsconfigPath)}`);
    return null;
  }

  const warnings: string[] = [];
  const errors: string[] = [];

  // spin up typedoc with the same options we'd pass on the command line
  const app = await Application.bootstrapWithPlugins({
    entryPoints,
    entryPointStrategy: EntryPointStrategy.Resolve,
    tsconfig: tsconfigPath,
    readme: 'none',
    includeVersion: true,
    categorizeByGroup: false,
    excludeExternals: true,
    excludePrivate: true,
    excludeProtected: true,
    excludeInternal: true,
    logLevel: LogLevel.Warn
  });

  const blockTags = (app.options.getValue('blockTags') as string[] | undefined) ?? [];
  // typedoc ignores @decorator out of the box and spams warnings, so we tell it that tag is legit here
  if (!blockTags.includes('@decorator')) app.options.setValue('blockTags', [...blockTags, '@decorator']);

  // typedoc writes to stdout, so we intercept the logger to stash warn/error lines for the manifest
  const originalLog = app.logger.log.bind(app.logger);
  app.logger.log = (message, level, ...rest) => {
    const raw = typeof message === 'string' ? message : JSON.stringify(message);
    const text = stripAnsi(raw);

    if (level === LogLevel.Error) errors.push(text);
    else if (level === LogLevel.Warn) warnings.push(text);

    originalLog(message, level, ...rest);
  };

  const project = await app.convert();
  const unscopedName = manifest.name.includes('/') ? (manifest.name.split('/').pop() ?? manifest.name) : manifest.name;
  const outputPath = getOutputPathForPackage(unscopedName);

  let succeeded = false;
  if (project && errors.length === 0) {
    // we only save the json if typedoc gave us a project and no hard errors
    await app.generateJson(project, outputPath);
    succeeded = true;
  } else if (await pathExists(outputPath)) {
    // if something failed and we had stale output, clean it up so nobody trusts old data
    await rm(outputPath, { force: true });
  }

  return {
    name: manifest.name,
    version: manifest.version,
    entryPoints: relativeEntryPoints,
    outputPath: succeeded ? outputPath : null,
    warnings,
    errors,
    succeeded
  };
}
