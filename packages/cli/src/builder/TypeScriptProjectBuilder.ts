import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { SeedcordError, SeedcordErrorCode } from '@seedcord/services';
import { build as tsupBuild } from 'tsup';

import { EntryPointCollector } from './EntryPointCollector';
import { RelativeSpecifierTransformer } from './RelativeSpecifierTransformer';

import type { ResolvedSeedcordDevConfig } from '../config/schema';
import type { ILogger } from '@seedcord/types';

export interface BuildResult {
    emittedEntry: string;
}

export class TypeScriptProjectBuilder {
    constructor(
        private readonly logger: ILogger,
        private readonly entries = new EntryPointCollector(),
        private readonly specifierTransformer = new RelativeSpecifierTransformer()
    ) {}

    public async build(config: ResolvedSeedcordDevConfig): Promise<BuildResult> {
        const tsconfigPath = this.resolveTsconfig(config);
        const { entryMap, primaryKey } = this.entries.collect(config, tsconfigPath);

        this.logger.info(`Building Seedcord project via ${tsconfigPath}`);

        try {
            await tsupBuild({
                entry: entryMap,
                outDir: config.build.outDir,
                format: ['esm'],
                outExtension: () => ({ js: '.js' }),
                shims: false,
                splitting: false,
                sourcemap: true,
                clean: false,
                skipNodeModulesBundle: true,
                minify: false,
                bundle: false,
                dts: false,
                target: 'node22',
                platform: 'node',
                keepNames: true,
                treeshake: false,
                tsconfig: tsconfigPath,
                silent: true
            });
            await this.specifierTransformer.transform(config.build.outDir);
        } catch (error: unknown) {
            const reason = error instanceof Error ? error.message : 'Unknown build error';
            throw new SeedcordError(SeedcordErrorCode.CliBuildFailed, [reason]);
        }

        const emittedEntry = this.resolveEmittedEntry(config.build.outDir, primaryKey);
        if (!existsSync(emittedEntry)) {
            throw new SeedcordError(SeedcordErrorCode.CliBuildFailed, [
                `Expected output file ${emittedEntry} missing after build`
            ]);
        }

        this.logger.info(`Emitted entry: ${emittedEntry}`);
        return { emittedEntry } satisfies BuildResult;
    }

    private resolveTsconfig(config: ResolvedSeedcordDevConfig): string {
        if (config.build.tsconfig) {
            if (!existsSync(config.build.tsconfig)) {
                throw new SeedcordError(SeedcordErrorCode.CliBuildTsconfigNotFound, [config.build.tsconfig]);
            }

            return config.build.tsconfig;
        }

        const configDir = dirname(config.configFile);
        const candidates = ['tsconfig.build.json', 'tsconfig.json']
            .map((file) => resolve(configDir, file))
            .filter((candidate) => existsSync(candidate));

        const [firstCandidate] = candidates;
        if (firstCandidate) return firstCandidate;

        throw new SeedcordError(SeedcordErrorCode.CliBuildTsconfigNotFound, [configDir]);
    }

    private resolveEmittedEntry(outDir: string, entryKey: string): string {
        return resolve(outDir, `${entryKey}.js`);
    }
}
