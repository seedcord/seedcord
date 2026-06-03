import path from 'node:path';

import { Extractor, ExtractorConfig, ExtractorLogLevel, type IConfigFile } from '@microsoft/api-extractor';

import { pathExists } from './utils';
import { readPackageManifest, resolveEntryPoints, unscopedName } from './workspace';

import type { ApiDocsPaths } from './paths';
import type { PackageDocResult } from './types';

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
        // AE trims `@internal` from the doc model by default; keep everything. `@internal` is a
        // render-time badge here, not an API-surface gate, so internal symbols still get pages.
        releaseTagsToTrim: []
    };

    return {
        projectFolder: options.packageDir,
        mainEntryPointFilePath: options.entryPoint,
        // No bundledPackages: each package documents only its own surface. Folding a re-exported
        // workspace dep's symbols inline made API Extractor mis-stamp their owning package (rushstack
        // #3521/#3593); re-exports now resolve cross-package and the umbrella package lists them.
        compiler: { tsconfigFilePath: options.tsconfigPath },
        apiReport: { enabled: false },
        docModel,
        dtsRollup: { enabled: false },
        tsdocMetadata: { enabled: false },
        messages: {
            compilerMessageReporting: { default: { logLevel: ExtractorLogLevel.Warning } },
            extractorMessageReporting: {
                default: { logLevel: ExtractorLogLevel.Warning },
                // forgotten exports are the two-tier feature, not a defect. This project does not
                // use release tags (@public/@beta/...) as an API contract; `@internal` is only a
                // render-time badge, so AE's release-tag coherence checks and the underscore-prefix
                // convention are all noise here.
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

// The built declaration entry: tsdown emits `index.d.mts`, tsc emits `index.d.ts`. Prefer the
// bundler output the real packages ship, fall back to the tsc output the test fixture builds.
const DECLARATION_ENTRY_CANDIDATES = ['dist/index.d.mts', 'dist/index.d.ts'];

async function resolveDeclarationEntry(packageDir: string): Promise<string | null> {
    for (const candidate of DECLARATION_ENTRY_CANDIDATES) {
        const absolute = path.join(packageDir, candidate);
        if (await pathExists(absolute)) return absolute;
    }
    return null;
}

/**
 * Extract one package's API doc model with API Extractor, emitting `<unscoped>.api.json`.
 */
export async function extractPackageApiModel(
    packageDir: string,
    paths: ApiDocsPaths
): Promise<PackageDocResult | null> {
    const manifest = await readPackageManifest(packageDir);
    if (manifest.private) return null;

    // A package with no resolvable source entry (e.g. a config-only package) is not documentable.
    const srcEntries = await resolveEntryPoints(packageDir, manifest);
    const primaryEntry = srcEntries[0];
    if (!primaryEntry) return null;

    const entryPoint = await resolveDeclarationEntry(packageDir);
    if (!entryPoint) {
        throw new Error(
            `API Extractor needs a built declaration entry for ${manifest.name}: ${paths.toRepoRelative(
                path.join(packageDir, 'dist/index.d.mts')
            )} is missing. Run the package build first.`
        );
    }

    const tsconfigPath = path.join(packageDir, 'tsconfig.json');
    if (!(await pathExists(tsconfigPath))) {
        throw new Error(`Missing tsconfig for ${manifest.name} at ${paths.toRepoRelative(tsconfigPath)}.`);
    }

    const apiJsonPath = path.join(paths.outputDir, `${unscopedName(manifest.name)}.api.json`);

    const config = ExtractorConfig.prepare({
        configObjectFullPath: path.join(packageDir, 'api-extractor.json'),
        packageJsonFullPath: path.join(packageDir, 'package.json'),
        configObject: buildConfigObject({
            packageDir,
            entryPoint,
            tsconfigPath,
            apiJsonPath
        })
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

    return {
        name: manifest.name,
        version: manifest.version,
        entryPoints: [path.relative(packageDir, entryPoint)],
        // The src entry the source pass must walk (matches AE's, honoring a seedcordDocs override).
        sourceEntry: path.relative(packageDir, primaryEntry).split(path.sep).join('/'),
        outputPath: result.succeeded ? apiJsonPath : null,
        warnings,
        errors,
        succeeded: result.succeeded
    };
}
