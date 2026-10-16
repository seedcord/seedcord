import { mkdirSync, mkdtempDisposableSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { assert, describe, it, expect, onTestFinished } from 'vitest';

import { ProjectLoader } from '#core/config/ProjectLoader';
import { cloudflareConfigSource, linkPackages } from '#tests/edgeFolder';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { OpenModules } from '#core/modules/ModuleLoader';

function tempProject(): string {
    const projectDir = mkdtempDisposableSync(join(tmpdir(), 'seedcord-config-'));
    onTestFinished(() => projectDir.remove());
    // the loader resolves against the real path of a mac temp dir
    return realpathSync(projectDir.path);
}

interface StubModules {
    open: OpenModules;
    closed: () => boolean;
}

function stubModulesExporting(config: unknown): StubModules {
    let closed = false;
    const modules = {
        importModule: <TModule = unknown>(): Promise<TModule> => Promise.resolve({ default: config } as TModule),
        [Symbol.asyncDispose]: () => {
            closed = true;
            return Promise.resolve();
        }
    };

    return { open: () => Promise.resolve(modules), closed: () => closed };
}

function projectWith(config: unknown): { projectDir: string; load: () => Promise<ResolvedSeedcordConfig> } {
    const projectDir = tempProject();
    writeFileSync(join(projectDir, 'seedcord.config.ts'), '');
    const { open } = stubModulesExporting(config);

    const load = async (): Promise<ResolvedSeedcordConfig> => {
        const { config: resolved } = await new ProjectLoader(open).open(projectDir);
        return resolved;
    };

    return { projectDir, load };
}

const MINIMAL = { instance: './bot.ts', entry: './index.ts' };
const EDGE_MINIMAL = { instance: './bot.ts' };
const CLOUDFLARE_CONFIG = 'cloudflare.config.ts';

async function writeEdgeConfig(projectDir: string): Promise<void> {
    writeFileSync(join(projectDir, CLOUDFLARE_CONFIG), cloudflareConfigSource());
    await linkPackages(projectDir, ['cf']);
}

function writeTsconfig(projectDir: string, compilerOptions: Record<string, unknown>, name = 'tsconfig.json'): void {
    writeFileSync(join(projectDir, name), JSON.stringify({ compilerOptions, include: ['seedcord.config.ts'] }));
}

describe('ProjectLoader', () => {
    it('resolves paths and build defaults relative to the config folder', async () => {
        const { projectDir, load } = projectWith({ ...MINIMAL, root: './src' });

        const resolved = await load();

        expect(resolved.root).toBe(resolve(projectDir, 'src'));
        expect(resolved.instance).toBe(resolve(projectDir, 'src/bot.ts'));
        expect(resolved.target).toEqual({
            kind: 'server',
            entry: resolve(projectDir, 'src/index.ts'),
            outDir: resolve(projectDir, 'dist')
        });
        expect(resolved.build.tsconfig).toBeUndefined();
    });
});

describe('ProjectLoader target', () => {
    it('targets a server when the config folder has no cloudflare.config.ts', async () => {
        const { projectDir, load } = projectWith(MINIMAL);

        const { target } = await load();

        expect(target).toMatchObject({ kind: 'server', entry: join(projectDir, 'index.ts') });
    });

    it('targets edge when a cloudflare.config.ts and a tsconfig with the workerd condition are in the config folder', async () => {
        const { projectDir, load } = projectWith(EDGE_MINIMAL);
        await writeEdgeConfig(projectDir);
        writeTsconfig(projectDir, { customConditions: ['workerd'] });

        const { target } = await load();

        expect(target).toMatchObject({ kind: 'edge', cloudflareConfig: join(projectDir, CLOUDFLARE_CONFIG) });
    });

    it('reads the workerd condition through the tsconfig extends chain', async () => {
        const { projectDir, load } = projectWith(EDGE_MINIMAL);
        await writeEdgeConfig(projectDir);
        writeFileSync(
            join(projectDir, 'base.json'),
            JSON.stringify({ compilerOptions: { customConditions: ['workerd'] } })
        );
        writeFileSync(
            join(projectDir, 'tsconfig.json'),
            JSON.stringify({ extends: './base.json', include: ['seedcord.config.ts'] })
        );

        const { target } = await load();

        expect(target.kind).toBe('edge');
    });

    it('throws CliEdgeWithoutWorkerdCondition for a cloudflare.config.ts whose tsconfig lacks the condition', async () => {
        const { projectDir, load } = projectWith(EDGE_MINIMAL);
        await writeEdgeConfig(projectDir);
        writeTsconfig(projectDir, {});

        await expect(load()).rejects.toMatchObject({ code: SeedcordErrorCode.CliEdgeWithoutWorkerdCondition });
    });

    it('throws CliTsconfigNotFound for a cloudflare.config.ts with no tsconfig', async () => {
        const { projectDir, load } = projectWith(EDGE_MINIMAL);
        await writeEdgeConfig(projectDir);

        await expect(load()).rejects.toMatchObject({ code: SeedcordErrorCode.CliTsconfigNotFound });
    });

    it('throws CliConfigFieldUnused for a server config that sets port', async () => {
        const { projectDir, load } = projectWith({ ...MINIMAL, port: 9000 });

        await expect(load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigFieldUnused,
            message: expect.stringContaining(join(projectDir, 'seedcord.config.ts')) as string
        });
    });

    it('throws CliWorkerdConditionWithoutCloudflareConfig for the workerd condition with no cloudflare.config.ts', async () => {
        const { projectDir, load } = projectWith(MINIMAL);
        writeTsconfig(projectDir, { customConditions: ['workerd'] });

        await expect(load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliWorkerdConditionWithoutCloudflareConfig
        });
    });

    it('reads the tsconfig that build.tsconfig points at', async () => {
        const { projectDir, load } = projectWith({ ...EDGE_MINIMAL, build: { tsconfig: './tsconfig.build.json' } });
        await writeEdgeConfig(projectDir);
        writeTsconfig(projectDir, {});
        writeTsconfig(projectDir, { customConditions: ['workerd'] }, 'tsconfig.build.json');

        const { target } = await load();

        expect(target.kind).toBe('edge');
    });

    it('throws CliConfigFileUnreadable for a tsconfig TypeScript cannot parse', async () => {
        const { projectDir, load } = projectWith(MINIMAL);
        writeFileSync(join(projectDir, 'tsconfig.json'), JSON.stringify({ extends: './missing.json' }));

        await expect(load()).rejects.toMatchObject({ code: SeedcordErrorCode.CliConfigFileUnreadable });
    });
});

describe('ProjectLoader entry on an edge bot', () => {
    async function edgeProjectWith(config: unknown): Promise<ReturnType<typeof projectWith>> {
        const project = projectWith(config);
        await writeEdgeConfig(project.projectDir);
        writeTsconfig(project.projectDir, { customConditions: ['workerd'] });
        return project;
    }

    it('loads a config without entry', async () => {
        const { projectDir, load } = await edgeProjectWith(EDGE_MINIMAL);

        const { target } = await load();

        expect(target).toMatchObject({
            kind: 'edge',
            cloudflareConfig: join(projectDir, CLOUDFLARE_CONFIG),
            port: 8787
        });
    });

    it('reads the dev port from port', async () => {
        const { load } = await edgeProjectWith({ ...EDGE_MINIMAL, port: 9000 });

        const { target } = await load();

        expect(target).toMatchObject({ kind: 'edge', port: 9000 });
    });

    it.each([-1, 65_536, 80.5, '8787'])('throws CliConfigInvalidField for a port of %j', async (port) => {
        const { load } = await edgeProjectWith({ ...EDGE_MINIMAL, port });

        await expect(load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigInvalidField,
            message: expect.stringContaining('port') as string
        });
    });

    it('throws CliConfigFieldUnused for an edge config that sets build.outDir', async () => {
        const { projectDir, load } = await edgeProjectWith({ ...EDGE_MINIMAL, build: { outDir: './out' } });

        await expect(load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigFieldUnused,
            message: expect.stringContaining(join(projectDir, 'seedcord.config.ts')) as string
        });
    });

    it('throws CliConfigFieldUnused for an edge config that sets entry', async () => {
        const { projectDir, load } = await edgeProjectWith(MINIMAL);

        await expect(load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigFieldUnused,
            message: expect.stringContaining(join(projectDir, 'seedcord.config.ts')) as string
        });
    });
});

describe('ProjectLoader paths with a #', () => {
    it('throws CliPathHasHash for a file under root whose name contains a #', async () => {
        const { projectDir, load } = projectWith(MINIMAL);
        mkdirSync(join(projectDir, 'handlers'));
        writeFileSync(join(projectDir, 'handlers', 'a#b.ts'), '');

        await expect(load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliPathHasHash,
            message: expect.stringContaining(join('handlers', 'a#b.ts')) as string
        });
    });

    it('throws one CliPathHasHash for a root whose own path contains a #', async () => {
        const { projectDir, load } = projectWith({ ...MINIMAL, root: './src#old' });
        mkdirSync(join(projectDir, 'src#old', 'handlers'), { recursive: true });

        await expect(load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliPathHasHash,
            message: expect.stringContaining('src#old') as string
        });
    });

    it('lists each # name once, leaving out what sits under a # folder', async () => {
        const { projectDir, load } = projectWith(MINIMAL);
        mkdirSync(join(projectDir, 'old#handlers', 'sub'), { recursive: true });
        writeFileSync(join(projectDir, 'old#handlers', 'a.ts'), '');
        writeFileSync(join(projectDir, 'old#handlers', 'sub', 'b.ts'), '');
        writeFileSync(join(projectDir, 'c#d.ts'), '');

        const caught: unknown = await load().catch((error: unknown) => error);

        assert(isSeedcordError(caught, 'SeedcordAggregateError', SeedcordErrorCode.CliProblems));
        expect(caught.errors).toEqual([
            expect.objectContaining({ message: expect.stringContaining('c#d.ts') as string }),
            expect.objectContaining({ message: expect.stringContaining('old#handlers') as string })
        ]);
    });

    it('skips node_modules, dot folders and outDir when it looks for # paths', async () => {
        const { projectDir, load } = projectWith(MINIMAL);
        for (const folder of ['node_modules/pkg#1', '.cache/x#y', 'dist/z#w']) {
            mkdirSync(join(projectDir, folder), { recursive: true });
        }

        await expect(load()).resolves.toBeDefined();
    });
});

describe('ProjectLoader validation', () => {
    it('throws CliConfigNotFound for a folder with no seedcord config', async () => {
        const open: OpenModules = () => Promise.reject(new Error('never opened'));

        await expect(new ProjectLoader(open).open(tempProject())).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigNotFound
        });
    });

    it('closes the module loader when the config is invalid', async () => {
        const projectDir = tempProject();
        writeFileSync(join(projectDir, 'seedcord.config.ts'), '');
        const modules = stubModulesExporting({ entry: './index.ts' });

        await expect(new ProjectLoader(modules.open).open(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigInvalidField
        });
        expect(modules.closed()).toBe(true);
    });

    it('closes the module loader with the project it returned', async () => {
        const projectDir = tempProject();
        writeFileSync(join(projectDir, 'seedcord.config.ts'), '');
        const modules = stubModulesExporting(MINIMAL);

        {
            await using project = await new ProjectLoader(modules.open).open(projectDir);
            expect(modules.closed()).toBe(false);
            expect(project.config.instance).toBe(resolve(projectDir, 'bot.ts'));
        }

        expect(modules.closed()).toBe(true);
    });

    it('resolves each tunnel shape into a mode', async () => {
        const tunnelOf = async (tunnel: unknown): Promise<ResolvedSeedcordConfig['tunnel']> => {
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
            message: expect.stringContaining('tunnel in the seedcord config') as string
        });
    });

    it('throws when instance is missing', async () => {
        await expect(projectWith({ entry: './index.ts' }).load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigInvalidField,
            message: expect.stringContaining('instance in the seedcord config') as string
        });
    });

    it('throws when entry is missing', async () => {
        await expect(projectWith({ instance: './bot.ts' }).load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigInvalidField,
            message: expect.stringContaining('entry in the seedcord config') as string
        });
    });

    it('reports every missing and invalid field at once', async () => {
        const error: unknown = await projectWith({ entry: './index.ts', tunnel: 'yes', build: { outDir: 1 } })
            .load()
            .catch((caught: unknown) => caught);

        assert(isSeedcordError(error, 'SeedcordAggregateError', SeedcordErrorCode.CliProblems));
        expect(error.errors).toMatchObject([
            { code: SeedcordErrorCode.CliConfigInvalidField },
            {
                code: SeedcordErrorCode.CliConfigInvalidField,
                message: expect.stringContaining('tunnel in the seedcord config') as string
            },
            {
                code: SeedcordErrorCode.CliConfigInvalidField,
                message: expect.stringContaining('build.outDir in the seedcord config') as string
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
        [{ restart: 'nope' }, 'hmr.restart in the seedcord config must be an array of strings.'],
        [{ rollback: 'nope' }, 'hmr.rollback in the seedcord config must be a boolean.'],
        [{ typecheck: 'nope' }, 'hmr.typecheck in the seedcord config must be a boolean or an object.']
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
            message: 'idleAnimation in the seedcord config must be a boolean.'
        });
    });

    // dev and codegen never write outDir
    it('loads a build.outDir that holds root', async () => {
        const { projectDir, load } = projectWith({ ...MINIMAL, root: './src', build: { outDir: '.' } });

        const { target } = await load();

        expect(target).toMatchObject({ outDir: projectDir });
    });
});
