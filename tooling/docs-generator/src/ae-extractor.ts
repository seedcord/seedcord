import path from 'node:path';

import { Extractor, ExtractorConfig, ExtractorLogLevel, type IConfigFile } from '@microsoft/api-extractor';

import { pathExists } from './utils';
import { readPackageManifest, resolveDocEntryPoints, unscopedName } from './workspace';

import type { ApiDocsPaths } from './paths';
import type { EntryDocResult, PackageDocResult } from './types';

function buildConfigObject(options: {
    packageDir: string;
    entryPoint: string;
    tsconfigPath: string;
    apiJsonPath: string;
}): IConfigFile {
    const docModel: IConfigFile['docModel'] = {
        enabled: true,
        apiJsonFilePath: options.apiJsonPath,
        includeForgottenExports: true,
        // AE trims `@internal` out of the doc model by default. Here it is only a render-time
        // badge, so internal symbols still get pages.
        releaseTagsToTrim: []
    };

    return {
        projectFolder: options.packageDir,
        mainEntryPointFilePath: options.entryPoint,
        // Folding a re-exported workspace dep's symbols inline made API Extractor mis-stamp their
        // owning package (rushstack #3521/#3593). With no bundledPackages, re-exports resolve
        // cross-package and the umbrella package lists them.
        compiler: { tsconfigFilePath: options.tsconfigPath },
        apiReport: { enabled: false },
        docModel,
        dtsRollup: { enabled: false },
        tsdocMetadata: { enabled: false },
        messages: {
            compilerMessageReporting: { default: { logLevel: ExtractorLogLevel.Warning } },
            extractorMessageReporting: {
                default: { logLevel: ExtractorLogLevel.Warning },
                // forgotten exports are expected here. this project sets no release tags
                // (@public/@beta/...), which leaves AE's coherence checks and its underscore-prefix
                // convention for `@internal` with nothing to report.
                'ae-forgotten-export': { logLevel: ExtractorLogLevel.None },
                'ae-missing-release-tag': { logLevel: ExtractorLogLevel.None },
                'ae-internal-missing-underscore': { logLevel: ExtractorLogLevel.None },
                'ae-incompatible-release-tags': { logLevel: ExtractorLogLevel.None },
                'ae-different-release-tags': { logLevel: ExtractorLogLevel.None }
            },
            tsdocMessageReporting: { default: { logLevel: ExtractorLogLevel.Warning } }
        }
    };
}

// doubling the hyphen first keeps `./a/b` and `./a-b` on separate files
function apiJsonNameFor(packageName: string, subpath: string): string {
    const unscoped = unscopedName(packageName);
    if (subpath === '.') return `${unscoped}.api.json`;
    const slug = subpath.replace(/^\.\//, '').replaceAll('-', '--').replaceAll('/', '-');
    return `${unscoped}.${slug}.api.json`;
}

function runExtractor(options: { packageDir: string; entryPoint: string; tsconfigPath: string; apiJsonPath: string }): {
    succeeded: boolean;
    warnings: string[];
    errors: string[];
} {
    const config = ExtractorConfig.prepare({
        configObjectFullPath: path.join(options.packageDir, 'api-extractor.json'),
        packageJsonFullPath: path.join(options.packageDir, 'package.json'),
        configObject: buildConfigObject(options)
    });

    const warnings: string[] = [];
    const errors: string[] = [];
    const result = Extractor.invoke(config, {
        localBuild: true,
        showVerboseMessages: false,
        messageCallback: (message) => {
            message.handled = true;
            if (message.logLevel === ExtractorLogLevel.Error) errors.push(message.text);
            else if (message.logLevel === ExtractorLogLevel.Warning) warnings.push(message.text);
        }
    });

    return { succeeded: result.succeeded, warnings, errors };
}

/**
 * Extract one package's API doc models with API Extractor, one `.api.json` per public entry point.
 */
export async function extractPackageApiModel(
    packageDir: string,
    paths: ApiDocsPaths
): Promise<PackageDocResult | null> {
    const manifest = await readPackageManifest(packageDir);
    if (manifest.private) return null;

    // @seedcord/tsconfig publishes json presets and declares no types
    const entryPoints = await resolveDocEntryPoints(packageDir, manifest);
    if (entryPoints.length === 0) return null;

    const tsconfigPath = path.join(packageDir, 'tsconfig.json');
    if (!(await pathExists(tsconfigPath))) {
        throw new Error(`Missing tsconfig for ${manifest.name} at ${paths.toRepoRelative(tsconfigPath)}.`);
    }

    const entries: EntryDocResult[] = entryPoints.map((entry) => {
        const apiJsonPath = path.join(paths.outputDir, apiJsonNameFor(manifest.name, entry.subpath));
        const run = runExtractor({
            packageDir,
            entryPoint: entry.declaration,
            tsconfigPath,
            apiJsonPath
        });

        return {
            subpath: entry.subpath,
            entryPoint: path.relative(packageDir, entry.declaration),
            ...(entry.sourceEntry && { sourceEntry: entry.sourceEntry }),
            outputPath: run.succeeded ? apiJsonPath : null,
            warnings: run.warnings,
            errors: run.errors,
            succeeded: run.succeeded
        };
    });

    const [first] = entries;
    const root = entries.find((entry) => entry.subpath === '.') ?? first;
    if (!root) return null;

    return {
        name: manifest.name,
        version: manifest.version,
        entries,
        entryPoints: entries.map((entry) => entry.entryPoint),
        ...(root.sourceEntry && { sourceEntry: root.sourceEntry }),
        outputPath: root.outputPath,
        warnings: entries.flatMap((entry) => entry.warnings),
        errors: entries.flatMap((entry) => entry.errors),
        succeeded: entries.every((entry) => entry.succeeded)
    };
}
