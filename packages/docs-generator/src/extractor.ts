import { readFile, rm, writeFile } from 'node:fs/promises';

import { Application, EntryPointStrategy, LogLevel } from 'typedoc';

import { defaultPaths } from './paths';
import { pathExists, stripAnsi } from './utils';
import { readPackageManifest, resolveEntryPoints, resolveTsconfigPath } from './workspace';

import type { ApiDocsPaths } from './paths';
import type { PackageDocResult } from './types';

const EXTERNAL_PLUGINS = ['typedoc-plugin-mdn-links', 'typedoc-plugin-dt-links'];
let externalPluginsLoaded = false;

const addVersionToJson = async (outputPath: string, version: string): Promise<void> => {
    const raw = await readFile(outputPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return;
    }

    const data = parsed as Record<string, unknown>;
    const entries = Object.entries(data).filter(([key]) => key !== 'version');
    const ordered: [string, unknown][] = [];
    let versionInserted = false;

    for (const [key, value] of entries) {
        ordered.push([key, value]);
        if (key === 'name') {
            ordered.push(['version', version]);
            versionInserted = true;
        }
    }

    if (!versionInserted) {
        ordered.unshift(['version', version]);
    }

    const output = Object.fromEntries(ordered);
    await writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8');
};

/**
 * run typedoc for one package and collect the status, warnings, and output location
 */
// eslint-disable-next-line max-statements
export async function extractPackageDocs(
    packageDir: string,
    paths: ApiDocsPaths = defaultPaths
): Promise<PackageDocResult | null> {
    const manifest = await readPackageManifest(packageDir);
    if (manifest.private) return null;

    const { absolute: entryPoints, relative: relativeEntryPoints } = await resolveEntryPoints(packageDir, manifest);
    if (entryPoints.length === 0) {
        console.warn(`⚠️  Skipping ${manifest.name}: no entry points found`);
        return null;
    }

    const tsconfigPath = resolveTsconfigPath(packageDir, manifest);
    if (!(await pathExists(tsconfigPath))) {
        console.warn(`⚠️  Skipping ${manifest.name}: tsconfig not found at ${paths.toRepoRelative(tsconfigPath)}`);
        return null;
    }

    const warnings: string[] = [];
    const errors: string[] = [];

    const app = await Application.bootstrapWithPlugins({
        entryPoints,
        entryPointStrategy: EntryPointStrategy.Resolve,
        tsconfig: tsconfigPath,
        readme: 'none',
        includeVersion: true,
        categorizeByGroup: false,
        excludeExternals: false,
        excludePrivate: true,
        excludeProtected: false,
        excludeInternal: false,
        logLevel: LogLevel.Warn,
        plugin: externalPluginsLoaded ? [] : EXTERNAL_PLUGINS
    });

    externalPluginsLoaded = true;

    const blockTags = (app.options.getValue('blockTags') as string[] | undefined) ?? [];
    if (!blockTags.includes('@decorator')) app.options.setValue('blockTags', [...blockTags, '@decorator']);

    const originalLog = app.logger.log.bind(app.logger);
    app.logger.log = (message, level, ...rest) => {
        const raw = typeof message === 'string' ? message : JSON.stringify(message);
        const text = stripAnsi(raw);

        if (level === LogLevel.Error) errors.push(text);
        else if (level === LogLevel.Warn) warnings.push(text);

        originalLog(message, level, ...rest);
    };

    const project = await app.convert();
    const unscopedName = manifest.name.includes('/')
        ? (manifest.name.split('/').pop() ?? manifest.name)
        : manifest.name;
    const outputPath = paths.getOutputPathForPackage(unscopedName);

    let succeeded = false;
    if (project && errors.length === 0) {
        await app.generateJson(project, outputPath);
        await addVersionToJson(outputPath, manifest.version);
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
