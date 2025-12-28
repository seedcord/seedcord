import { join, dirname, resolve } from 'node:path';

import { describe, it, expect, vi } from 'vitest';

import { DevRunner } from '@commands/dev/DevRunner';
import { ConfigLoader } from '@core/config/ConfigLoader';

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
            importModule<TModule = unknown>(): TModule {
                return {
                    default: { instance: './bot.ts', root: './src', entry: './index.ts' } satisfies SeedcordDevConfig
                } as TModule;
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
            importModule<TModule = unknown>(): TModule {
                return { default: { entry: './index.ts' } } as TModule;
            }
        };

        const loader = new ConfigLoader(moduleLoader, silentLogger);

        await expect(loader.load(join(process.cwd(), 'seedcord.config.ts'))).rejects.toThrow(
            'Config must include an `instance` string'
        );
    });

    it('throws when entry is missing', async () => {
        const moduleLoader: ModuleLoader = {
            importModule<TModule = unknown>(): TModule {
                return { default: { instance: './bot.ts' } } as TModule;
            }
        };

        const loader = new ConfigLoader(moduleLoader, silentLogger);

        await expect(loader.load(join(process.cwd(), 'seedcord.config.ts'))).rejects.toThrow(
            'Config must include an `entry` string'
        );
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

        const logger: ILogger = {
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn(),
            http: vi.fn(),
            verbose: vi.fn(),
            debug: vi.fn(),
            silly: vi.fn()
        };

        const runner = new DevRunner(locator as never, configLoader as never, logger);

        const actions = {
            setStatus: vi.fn(),
            setError: vi.fn()
        };

        await expect(runner.run(actions)).rejects.toThrow('Cannot find entry file');

        expect(locator.locate).toHaveBeenCalledTimes(1);
        expect(configLoader.load).toHaveBeenCalledWith(configPath);
    });
});
