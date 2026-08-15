import { join, dirname, resolve } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, it, expect, vi } from 'vitest';

import { DevRunner } from '#commands/dev/DevRunner';
import { ConfigLoader } from '#core/config/ConfigLoader';
import { DevStore } from '#ui/stores/DevStore';

import { silentLogger } from './silentLogger';

import type { CodegenRunner } from '#commands/codegen/CodegenRunner';
import type { TunnelRouter } from '#commands/dev/tunnel/TunnelRouter';
import type { ConfigLocator } from '#core/config/ConfigLocator';
import type { ResolvedTunnel, SeedcordDevConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';

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

    it('resolves each tunnel shape into a mode', async () => {
        const load = async (config: SeedcordDevConfig): Promise<ResolvedTunnel> => {
            const moduleLoader: ModuleLoader = {
                importModule<TModule = unknown>(_entryPath: string): Promise<TModule> {
                    return Promise.resolve({ default: config } as TModule);
                }
            };
            const resolved = await new ConfigLoader(moduleLoader, silentLogger).load(
                join(process.cwd(), 'seedcord.config.ts')
            );
            return resolved.tunnel;
        };

        const base = { instance: './bot.ts', entry: './index.ts' };

        await expect(load(base)).resolves.toEqual({ mode: 'quick' });
        await expect(load({ ...base, tunnel: true })).resolves.toEqual({ mode: 'quick' });
        await expect(load({ ...base, tunnel: false })).resolves.toEqual({ mode: 'off' });
        await expect(load({ ...base, tunnel: 'https://bot.example.com' })).resolves.toEqual({
            mode: 'url',
            url: 'https://bot.example.com'
        });
    });

    it.each([['yes'], ['http://bot.example.com'], [42]])('rejects %s as a tunnel', async (tunnel) => {
        const moduleLoader: ModuleLoader = {
            importModule<TModule = unknown>(_entryPath: string): Promise<TModule> {
                return Promise.resolve({
                    default: { instance: './bot.ts', entry: './index.ts', tunnel }
                } as TModule);
            }
        };

        const loader = new ConfigLoader(moduleLoader, silentLogger);

        await expect(loader.load(join(process.cwd(), 'seedcord.config.ts'))).rejects.toThrow(
            'Config `tunnel` must be a boolean or an https URL.'
        );
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

    it('carries hmr config through and resolves the typecheck tsconfig', async () => {
        const hmr = { restart: ['**/*.json'], typecheck: { tsconfig: './tsconfig.dev.json' } };
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
        expect(resolved.typecheck).toEqual({ enabled: true, tsconfig: resolve(process.cwd(), 'tsconfig.dev.json') });
    });

    it('leaves typecheck off when the config omits it', async () => {
        const moduleLoader: ModuleLoader = {
            importModule<TModule = unknown>(_entryPath: string): Promise<TModule> {
                return Promise.resolve({
                    default: { instance: './bot.ts', entry: './index.ts' } satisfies SeedcordDevConfig
                } as TModule);
            }
        };

        const resolved = await new ConfigLoader(moduleLoader, silentLogger).load(
            join(process.cwd(), 'seedcord.config.ts')
        );

        expect(resolved.typecheck).toEqual({ enabled: false });
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

    it('leaves idleAnimation on when the config omits it', async () => {
        const moduleLoader: ModuleLoader = {
            importModule<TModule = unknown>(_entryPath: string): Promise<TModule> {
                return Promise.resolve({
                    default: { instance: './bot.ts', entry: './index.ts' } satisfies SeedcordDevConfig
                } as TModule);
            }
        };

        const resolved = await new ConfigLoader(moduleLoader, silentLogger).load(
            join(process.cwd(), 'seedcord.config.ts')
        );

        expect(resolved.idleAnimation).toBe(true);
    });

    it('rejects a non-boolean idleAnimation', async () => {
        const moduleLoader: ModuleLoader = {
            importModule<TModule = unknown>(_entryPath: string): Promise<TModule> {
                return Promise.resolve({
                    default: { instance: './bot.ts', entry: './index.ts', idleAnimation: 'nope' }
                } as TModule);
            }
        };

        await expect(
            new ConfigLoader(moduleLoader, silentLogger).load(join(process.cwd(), 'seedcord.config.ts'))
        ).rejects.toMatchObject({ code: SeedcordErrorCode.CliConfigInvalidIdleAnimation });
    });

    it('rejects a non-boolean hmr.typecheck', async () => {
        const moduleLoader: ModuleLoader = {
            importModule<TModule = unknown>(_entryPath: string): Promise<TModule> {
                return Promise.resolve({
                    default: { instance: './bot.ts', entry: './index.ts', hmr: { typecheck: 'nope' } }
                } as TModule);
            }
        };

        await expect(
            new ConfigLoader(moduleLoader, silentLogger).load(join(process.cwd(), 'seedcord.config.ts'))
        ).rejects.toMatchObject({ code: SeedcordErrorCode.CliConfigInvalidHmrTypecheck });
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

        // justified: only the locator and the config loader are called here, codegen runs on refresh only
        const runner = new DevRunner({
            locator: locator as unknown as ConfigLocator,
            configLoader: configLoader as unknown as ConfigLoader,
            store: new DevStore(),
            codegen: { run: vi.fn() } as unknown as CodegenRunner,
            codegenLogger: silentLogger,
            // justified: this path never routes an event or quits
            tunnel: { route: () => undefined, stop: () => Promise.resolve() } as unknown as TunnelRouter
        });

        // run() swallows session errors through handleError, so rethrow for the assertion
        // @ts-expect-error accessing private method
        vi.spyOn(runner, 'handleError').mockImplementation((error: unknown) => {
            throw error;
        });

        await expect(runner.run()).rejects.toThrow(/Cannot find entry file|Failed to load url/);

        expect(locator.locate).toHaveBeenCalledTimes(1);
        expect(configLoader.load).toHaveBeenCalledWith(configPath);
    });
});
