import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { afterEach, assert, describe, it, expect, vi } from 'vitest';

import { DevRunner } from '#commands/dev/DevRunner';
import { ConfigLoader } from '#core/config/ConfigLoader';
import { DevStore } from '#ui/stores/DevStore';

import { silentLogger } from './silentLogger';

import type { CodegenRunner } from '#commands/codegen/CodegenRunner';
import type { TunnelRouter } from '#commands/dev/tunnel/TunnelRouter';
import type { ResolvedSeedcordDevConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';

const projectDirs: string[] = [];

afterEach(() => {
    while (projectDirs.length > 0) rmSync(projectDirs.pop() ?? '', { recursive: true, force: true });
});

function tempProject(): string {
    // the loader resolves against the real path of a mac temp dir
    const projectDir = realpathSync(mkdtempSync(join(tmpdir(), 'seedcord-config-')));
    projectDirs.push(projectDir);
    return projectDir;
}

// the stub module loader hands back `config` as the config file's default export
function projectWith(config: unknown): { projectDir: string; load: () => Promise<ResolvedSeedcordDevConfig> } {
    const projectDir = tempProject();
    writeFileSync(join(projectDir, 'seedcord.config.ts'), '');
    const moduleLoader: ModuleLoader = {
        importModule: <TModule = unknown>(): Promise<TModule> => Promise.resolve({ default: config } as TModule)
    };

    return { projectDir, load: () => new ConfigLoader(moduleLoader).load(projectDir) };
}

const MINIMAL = { instance: './bot.ts', entry: './index.ts' };

describe('ConfigLoader', () => {
    it('resolves paths and build defaults relative to the config folder', async () => {
        const { projectDir, load } = projectWith({ ...MINIMAL, root: './src' });

        const resolved = await load();

        expect(resolved.root).toBe(resolve(projectDir, 'src'));
        expect(resolved.instance).toBe(resolve(projectDir, 'src/bot.ts'));
        expect(resolved.entry).toBe(resolve(projectDir, 'src/index.ts'));
        expect(resolved.build.outDir).toBe(resolve(projectDir, 'dist'));
        expect(resolved.build.tsconfig).toBeUndefined();
    });

    it('throws CliConfigNotFound for a folder with no seedcord config', async () => {
        const moduleLoader: ModuleLoader = { importModule: () => Promise.reject(new Error('never imported')) };

        await expect(new ConfigLoader(moduleLoader).load(tempProject())).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigNotFound
        });
    });

    it('resolves each tunnel shape into a mode', async () => {
        const tunnelOf = async (tunnel: unknown): Promise<ResolvedSeedcordDevConfig['tunnel']> => {
            const resolved = await projectWith({ ...MINIMAL, tunnel }).load();
            return resolved.tunnel;
        };

        await expect(tunnelOf(undefined)).resolves.toEqual({ mode: 'quick' });
        await expect(tunnelOf(true)).resolves.toEqual({ mode: 'quick' });
        await expect(tunnelOf(false)).resolves.toEqual({ mode: 'off' });
        await expect(tunnelOf('https://bot.example.com')).resolves.toEqual({
            mode: 'url',
            url: 'https://bot.example.com'
        });
    });

    it.each([['yes'], ['http://bot.example.com'], [42]])('rejects %s as a tunnel', async (tunnel) => {
        await expect(projectWith({ ...MINIMAL, tunnel }).load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigInvalidField,
            message: expect.stringContaining('`tunnel`') as string
        });
    });

    it('throws when instance is missing', async () => {
        await expect(projectWith({ entry: './index.ts' }).load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigMissingInstance
        });
    });

    it('throws when entry is missing', async () => {
        await expect(projectWith({ instance: './bot.ts' }).load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigMissingEntry
        });
    });

    it('reports every missing and invalid field at once', async () => {
        const error: unknown = await projectWith({ entry: './index.ts', tunnel: 'yes', build: { outDir: 1 } })
            .load()
            .catch((caught: unknown) => caught);

        assert(isSeedcordError(error, 'SeedcordAggregateError', SeedcordErrorCode.CliConfigProblems));
        expect(error.errors).toMatchObject([
            { code: SeedcordErrorCode.CliConfigMissingInstance },
            { code: SeedcordErrorCode.CliConfigInvalidField, message: expect.stringContaining('`tunnel`') as string },
            {
                code: SeedcordErrorCode.CliConfigInvalidField,
                message: expect.stringContaining('`build.outDir`') as string
            }
        ]);
    });

    it('carries hmr config through and resolves the typecheck tsconfig', async () => {
        const hmr = { restart: ['**/*.json'], typecheck: { tsconfig: './tsconfig.dev.json' } };
        const { projectDir, load } = projectWith({ ...MINIMAL, hmr });

        const resolved = await load();

        expect(resolved.hmr).toEqual(hmr);
        expect(resolved.typecheck).toEqual({ enabled: true, tsconfig: resolve(projectDir, 'tsconfig.dev.json') });
    });

    it('leaves typecheck off when the config omits it', async () => {
        const { typecheck } = await projectWith(MINIMAL).load();

        expect(typecheck).toEqual({ enabled: false });
    });

    it('rejects a non-object default export', async () => {
        await expect(projectWith([]).load()).rejects.toMatchObject({ code: SeedcordErrorCode.CliConfigInvalidExport });
    });

    it.each([
        [{ restart: 'nope' }, 'Config `hmr.restart` must be an array of strings when provided.'],
        [{ rollback: 'nope' }, 'Config `hmr.rollback` must be a boolean when provided.'],
        [{ typecheck: 'nope' }, 'Config `hmr.typecheck` must be a boolean or an object when provided.']
    ])('rejects hmr %o', async (hmr, message) => {
        await expect(projectWith({ ...MINIMAL, hmr }).load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigInvalidField,
            message
        });
    });

    it('leaves idleAnimation on when the config omits it', async () => {
        const { idleAnimation } = await projectWith(MINIMAL).load();

        expect(idleAnimation).toBe(true);
    });

    it('rejects a non-boolean idleAnimation', async () => {
        await expect(projectWith({ ...MINIMAL, idleAnimation: 'nope' }).load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigInvalidField,
            message: 'Config `idleAnimation` must be a boolean when provided.'
        });
    });

    // dev and codegen never write outDir
    it('loads a build.outDir that holds root', async () => {
        const { projectDir, load } = projectWith({ ...MINIMAL, root: './src', build: { outDir: '.' } });

        const { build } = await load();

        expect(build.outDir).toBe(projectDir);
    });
});

describe('DevRunner', () => {
    it('loads and starts the Seedcord instance', async () => {
        const projectDir = process.cwd();
        const instancePath = join(projectDir, 'src/bot.ts');
        const configLoader = {
            load: vi.fn(() => ({
                instance: instancePath,
                root: join(projectDir, 'src'),
                configFile: join(projectDir, 'seedcord.config.ts'),
                entry: instancePath,
                build: { outDir: join(projectDir, 'dist') }
            }))
        };

        // justified: only the config loader is called here, codegen runs on refresh only
        const runner = new DevRunner({
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
        expect(configLoader.load).toHaveBeenCalledTimes(1);
    });
});
