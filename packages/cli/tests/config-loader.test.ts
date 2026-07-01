import { join, dirname, resolve } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordBrand } from '@seedcord/types/internal';
import { describe, it, expect, vi } from 'vitest';

import { DevRunner, isSeedcordInstance } from '@commands/dev/DevRunner';
import { ConfigLoader } from '@core/config/ConfigLoader';
import { DevStore } from '@ui/stores/DevStore';

import type { CodegenRunner } from '@commands/codegen/CodegenRunner';
import type { ConfigLocator } from '@core/config/ConfigLocator';
import type { SeedcordDevConfig } from '@core/config/schema';
import type { ModuleLoader } from '@core/modules/ModuleLoader';
import type { ILogger } from '@seedcord/types';

const silentLogger: ILogger = {
    error: () => undefined,
    warn: () => undefined,
    info: () => undefined,
    http: () => undefined,
    verbose: () => undefined,
    debug: () => undefined,
    silly: () => undefined
};

describe('ConfigLoader', () => {
    it('resolves paths and build defaults relative to config directory', async () => {
        const moduleLoader: ModuleLoader = {
            importModule<TModule = unknown>(_entryPath: string): Promise<TModule> {
                return Promise.resolve({
                    default: { instance: './bot.ts', root: './src', entry: './index.ts' } satisfies SeedcordDevConfig
                } as TModule);
            }
        };

        const loader = new ConfigLoader(moduleLoader, silentLogger);
        const configFile = join(process.cwd(), 'seedcord.config.ts');

        const resolved = await loader.load(configFile);

        expect(resolved.root).toBe(resolve(process.cwd(), 'src'));
        expect(resolved.instance).toBe(resolve(process.cwd(), 'src/bot.ts'));
        expect(resolved.entry).toBe(resolve(process.cwd(), 'src/index.ts'));
        expect(resolved.build.outDir).toBe(resolve(process.cwd(), 'dist'));
        expect(resolved.build.bootstrap).toBe(resolve(process.cwd(), 'dist/index.mjs'));
        expect(resolved.build.tsconfig).toBeUndefined();
    });

    it('throws when instance is missing', async () => {
        const moduleLoader: ModuleLoader = {
            importModule<TModule = unknown>(_entryPath: string): Promise<TModule> {
                return Promise.resolve({ default: { entry: './index.ts' } } as TModule);
            }
        };

        const loader = new ConfigLoader(moduleLoader, silentLogger);

        await expect(loader.load(join(process.cwd(), 'seedcord.config.ts'))).rejects.toThrow(
            'Config must include an `instance` string'
        );
    });

    it('throws when entry is missing', async () => {
        const moduleLoader: ModuleLoader = {
            importModule<TModule = unknown>(_entryPath: string): Promise<TModule> {
                return Promise.resolve({ default: { instance: './bot.ts' } } as TModule);
            }
        };

        const loader = new ConfigLoader(moduleLoader, silentLogger);

        await expect(loader.load(join(process.cwd(), 'seedcord.config.ts'))).rejects.toThrow(
            'Config must include an `entry` string'
        );
    });

    it('carries hmr config through to the resolved config and resolves hmr.tsconfig', async () => {
        const hmr = { restart: ['**/*.json'], tsconfig: './tsconfig.dev.json' };
        const moduleLoader: ModuleLoader = {
            importModule<TModule = unknown>(_entryPath: string): Promise<TModule> {
                return Promise.resolve({
                    default: { instance: './bot.ts', entry: './index.ts', hmr } satisfies SeedcordDevConfig
                } as TModule);
            }
        };

        const resolved = await new ConfigLoader(moduleLoader, silentLogger).load(
            join(process.cwd(), 'seedcord.config.ts')
        );

        expect(resolved.hmr).toEqual(hmr);
        expect(resolved.tsconfig).toBe(resolve(process.cwd(), 'tsconfig.dev.json'));
    });

    it('rejects a non-object default export', async () => {
        const moduleLoader: ModuleLoader = {
            importModule<TModule = unknown>(_entryPath: string): Promise<TModule> {
                return Promise.resolve({ default: [] } as TModule);
            }
        };

        await expect(
            new ConfigLoader(moduleLoader, silentLogger).load(join(process.cwd(), 'seedcord.config.ts'))
        ).rejects.toMatchObject({ code: SeedcordErrorCode.CliConfigInvalidExport });
    });

    it('rejects a non-array hmr.restart', async () => {
        const moduleLoader: ModuleLoader = {
            importModule<TModule = unknown>(_entryPath: string): Promise<TModule> {
                return Promise.resolve({
                    default: { instance: './bot.ts', entry: './index.ts', hmr: { restart: 'nope' } }
                } as TModule);
            }
        };

        await expect(
            new ConfigLoader(moduleLoader, silentLogger).load(join(process.cwd(), 'seedcord.config.ts'))
        ).rejects.toMatchObject({ code: SeedcordErrorCode.CliConfigInvalidHmrRestart });
    });

    it('rejects a non-boolean hmr.rollback', async () => {
        const moduleLoader: ModuleLoader = {
            importModule<TModule = unknown>(_entryPath: string): Promise<TModule> {
                return Promise.resolve({
                    default: { instance: './bot.ts', entry: './index.ts', hmr: { rollback: 'nope' } }
                } as TModule);
            }
        };

        await expect(
            new ConfigLoader(moduleLoader, silentLogger).load(join(process.cwd(), 'seedcord.config.ts'))
        ).rejects.toMatchObject({ code: SeedcordErrorCode.CliConfigInvalidHmrRollback });
    });
});

describe('isSeedcordInstance', () => {
    it('accepts a branded object', () => {
        expect(isSeedcordInstance({ [SeedcordBrand]: true })).toBe(true);
    });

    it('rejects a look-alike without the brand', () => {
        expect(isSeedcordInstance({ config: {}, start: () => undefined })).toBe(false);
        expect(isSeedcordInstance({ [SeedcordBrand]: false })).toBe(false);
        expect(isSeedcordInstance(null)).toBe(false);
        expect(isSeedcordInstance('nope')).toBe(false);
    });
});

describe('DevRunner', () => {
    it('loads and starts the Seedcord instance', async () => {
        const configPath = join(process.cwd(), 'seedcord.config.ts');
        const instancePath = join(process.cwd(), 'src/bot.ts');

        const locator = { locate: vi.fn(() => configPath) };
        const configLoader = {
            load: vi.fn(() => ({
                instance: instancePath,
                root: dirname(instancePath),
                configFile: configPath,
                entry: instancePath,
                build: {
                    outDir: join(process.cwd(), 'dist'),
                    bootstrap: join(process.cwd(), 'dist/index.mjs')
                }
            }))
        };

        // locator and configLoader are the only doubles exercised here, codegen runs on refresh only.
        const runner = new DevRunner(
            locator as unknown as ConfigLocator,
            configLoader as unknown as ConfigLoader,
            new DevStore(),
            { run: vi.fn() } as unknown as CodegenRunner,
            silentLogger
        );

        // run() swallows session errors through handleError, so rethrow here to let the assertion observe them.
        // @ts-expect-error accessing private method
        vi.spyOn(runner, 'handleError').mockImplementation((error: unknown) => {
            throw error;
        });

        await expect(runner.run()).rejects.toThrow(/Cannot find entry file|Failed to load url/);

        expect(locator.locate).toHaveBeenCalledTimes(1);
        expect(configLoader.load).toHaveBeenCalledWith(configPath);
    });
});
