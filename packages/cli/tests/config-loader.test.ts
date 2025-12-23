import { join, dirname, resolve } from 'node:path';

import { describe, it, expect, vi } from 'vitest';

import { ConfigLoader } from '../src/config/ConfigLoader';
import { SeedcordDevRunner } from '../src/runtime/SeedcordDevRunner';

import type { SeedcordDevConfig } from '../src/config/schema';
import type { ModuleLoader } from '../src/modules/ModuleLoader';
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
    it('resolves entry relative to the config directory', async () => {
        const moduleLoader: ModuleLoader = {
            importModule<TModule = unknown>(): TModule {
                return { default: { instance: './bot.ts', root: './src' } satisfies SeedcordDevConfig } as TModule;
            }
        };

        const loader = new ConfigLoader(moduleLoader, silentLogger);
        const configFile = join(process.cwd(), 'seedcord.config.ts');

        const resolved = await loader.load(configFile);

        expect(resolved.root).toBe(resolve(process.cwd(), 'src'));
        expect(resolved.instance).toBe(resolve(process.cwd(), 'src/bot.ts'));
    });

    it('throws when entry is missing', async () => {
        const moduleLoader: ModuleLoader = {
            importModule<TModule = unknown>(): TModule {
                return { default: {} } as TModule;
            }
        };

        const loader = new ConfigLoader(moduleLoader, silentLogger);

        await expect(loader.load(join(process.cwd(), 'seedcord.config.ts'))).rejects.toThrow(
            'Config must include an `instance` string'
        );
    });
});

describe('SeedcordDevRunner', () => {
    it('loads and starts the Seedcord instance', async () => {
        const configPath = join(process.cwd(), 'seedcord.config.ts');
        const instancePath = join(process.cwd(), 'src/bot.ts');

        const locator = { locate: vi.fn(() => configPath) };
        const configLoader = {
            load: vi.fn(() => ({ instance: instancePath, root: dirname(instancePath), configFile: configPath }))
        };
        const start = vi.fn(() => undefined);
        const instanceLoader = { load: vi.fn(() => ({ start })) };

        const logger: ILogger = {
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn(),
            http: vi.fn(),
            verbose: vi.fn(),
            debug: vi.fn(),
            silly: vi.fn()
        };

        const runner = new SeedcordDevRunner(locator as never, configLoader as never, instanceLoader as never, logger);

        await runner.run();

        expect(locator.locate).toHaveBeenCalledTimes(1);
        expect(configLoader.load).toHaveBeenCalledWith(configPath);
        expect(instanceLoader.load).toHaveBeenCalledWith(instancePath);
        expect(start).toHaveBeenCalledTimes(1);
    });
});
