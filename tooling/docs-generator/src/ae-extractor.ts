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

// tsdown emits `index.d.mts` and tsc emits `index.d.ts`. The bundler output comes first because
// that is what the published packages contain. The tsc output only exists for the test fixture.
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
        // the source pass walks this, and a `seedcordDocs` override can move it off src/index.ts
        sourceEntry: path.relative(packageDir, primaryEntry).split(path.sep).join('/'),
        outputPath: result.succeeded ? apiJsonPath : null,
        warnings,
        errors,
        succeeded: result.succeeded
    };
}
