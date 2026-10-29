import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { botFolder, toPosixPath } from '@seedcord/utils/internal';
import { assert, describe, it, expect, onTestFinished, vi } from 'vitest';

import { ProjectLoader } from '#core/config/ProjectLoader';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { ShellMode } from '#src/core/ShellMode';
import { copyEdgeBotForTest } from '#tests/commands/build/edgeBot';
import { cloudflareConfigSource } from '#tests/edgeFolder';

import { MINIMAL, openProject, projectWith, stubModulesExporting, tempProject } from './projectLoaderFixtures';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { OpenModules } from '#core/modules/ModuleLoader';

const EDGE_MINIMAL = { instance: './bot.ts' };
const CLOUDFLARE_CONFIG = 'cloudflare.config.ts';

function writeEdgeConfig(projectDir: string): void {
    writeFileSync(join(projectDir, CLOUDFLARE_CONFIG), cloudflareConfigSource());
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
            start: resolve(projectDir, 'src/index.ts'),
            outDir: resolve(projectDir, 'dist')
        });
        expect(resolved.build.tsconfig).toBeUndefined();
    });

    it('resolves every path under a symlinked root to the folder the link points at', async () => {
        const projectDir = tempProject();
        writeFileSync(join(projectDir, 'seedcord.config.ts'), '');
        const source = join(projectDir, 'source');
        mkdirSync(source);
        symlinkSync(source, join(projectDir, 'src'), 'dir');
        const { open } = stubModulesExporting({ ...MINIMAL, root: './src', files: ['./locales'] });

        await using loaded = await new ProjectLoader(open, new ShellMode()).readConfig(projectDir);

        expect(loaded.config).toMatchObject({
            root: source,
            instance: join(source, 'bot.ts'),
            files: [join(source, 'locales')],
            target: { start: join(source, 'index.ts') }
        });
    });

    it.each([
        [undefined, 'production'],
        [{ key: 'ENV', value: 'staging' } as const, 'staging']
    ])('gives envapt the .env file of the mode the bot loads in', async (shellVar, mode) => {
        const projectDir = tempProject();
        writeFileSync(join(projectDir, 'seedcord.config.ts'), '');
        for (const name of ['test', 'staging', 'production']) {
            writeFileSync(join(projectDir, `.env.${name}`), `PROBE=${name}\n`);
        }
        const cwd = process.cwd();
        process.chdir(projectDir);
        onTestFinished(() => process.chdir(cwd));
        // envapt reads the folder it loads in, under vitest's NODE_ENV=test
        vi.resetModules();
        const [{ ProjectLoader: FreshLoader }, { ShellMode: FreshShell }, { Envapter }] = await Promise.all([
            import('#core/config/ProjectLoader'),
            import('#src/core/ShellMode'),
            import('envapt')
        ]);
        const { open } = stubModulesExporting(MINIMAL);

        await using _project = await openProject(
            new FreshLoader(open, new FreshShell(shellVar), 'production'),
            projectDir
        );

        expect(Envapter.get('PROBE')).toBe(mode);
    });
});

describe('ProjectLoader target', () => {
    it('targets a server when the config folder has no cloudflare.config.ts', async () => {
        const { projectDir, load } = projectWith(MINIMAL);

        const { target } = await load();

        expect(target).toMatchObject({ kind: 'server', start: join(projectDir, 'index.ts') });
    });

    it('targets edge when a cloudflare.config.ts and a tsconfig with the workerd condition are in the config folder', async () => {
        const { projectDir, load } = projectWith(EDGE_MINIMAL);
        writeEdgeConfig(projectDir);
        writeTsconfig(projectDir, { customConditions: ['workerd'] });

        const { target } = await load();

        expect(target).toMatchObject({ kind: 'edge', cloudflareConfig: join(projectDir, CLOUDFLARE_CONFIG) });
    });

    it('reads the workerd condition through the tsconfig extends chain', async () => {
        const { projectDir, load } = projectWith(EDGE_MINIMAL);
        writeEdgeConfig(projectDir);
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
        writeEdgeConfig(projectDir);
        writeTsconfig(projectDir, {});

        await expect(load()).rejects.toMatchObject({ code: SeedcordErrorCode.CliEdgeWithoutWorkerdCondition });
    });

    // only the real loader runs cloudflare.config.ts
    it('points at a stray cloudflare.config.ts in a node bot without cf', async () => {
        const projectDir = tempProject();
        writeFileSync(join(projectDir, 'seedcord.config.ts'), `export default ${JSON.stringify(MINIMAL)};\n`);
        writeFileSync(join(projectDir, CLOUDFLARE_CONFIG), cloudflareConfigSource());
        writeTsconfig(projectDir, {});

        await expect(
            openProject(new ProjectLoader(openModuleLoader, new ShellMode()), projectDir)
        ).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeWithoutWorkerdCondition,
            message: expect.stringContaining(toPosixPath(join(projectDir, CLOUDFLARE_CONFIG))) as string
        });
    });

    it('throws CliTsconfigNotFound for a cloudflare.config.ts with no tsconfig', async () => {
        const { projectDir, load } = projectWith(EDGE_MINIMAL);
        writeEdgeConfig(projectDir);

        await expect(load()).rejects.toMatchObject({ code: SeedcordErrorCode.CliTsconfigNotFound });
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
        writeEdgeConfig(projectDir);
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

describe('ProjectLoader on an edge bot', () => {
    function edgeProjectWith(config: unknown): ReturnType<typeof projectWith> {
        const project = projectWith(config);
        writeEdgeConfig(project.projectDir);
        writeTsconfig(project.projectDir, { customConditions: ['workerd'] });
        return project;
    }

    it('serves dev on port 3000 by default', async () => {
        const { projectDir, load } = edgeProjectWith(EDGE_MINIMAL);

        const { target } = await load();

        expect(target).toMatchObject({
            kind: 'edge',
            cloudflareConfig: join(projectDir, CLOUDFLARE_CONFIG),
            port: 3000
        });
    });

    it('reads the dev port from port', async () => {
        const { load } = edgeProjectWith({ ...EDGE_MINIMAL, port: 9000 });

        const { target } = await load();

        expect(target).toMatchObject({ kind: 'edge', port: 9000 });
    });

    it('gives a config that imports cloudflare:workers the worker env', async () => {
        const projectDir = await copyEdgeBotForTest();
        writeFileSync(
            join(projectDir, CLOUDFLARE_CONFIG),
            cloudflareConfigSource("DISCORD_BOT_TOKEN: bindings.secret(), DEV_PORT: bindings.text('4321')")
        );
        writeFileSync(
            join(projectDir, 'seedcord.config.ts'),
            "import { env } from 'cloudflare:workers';\n\nexport default { root: './src', instance: './bot.ts', port: Number(env.DEV_PORT) };\n"
        );

        await using project = await openProject(new ProjectLoader(openModuleLoader, new ShellMode()), projectDir);

        expect(project.config.target).toMatchObject({ kind: 'edge', port: 4321 });
    });

    it.each([-1, 65_536, 80.5, '8787'])('throws CliConfigInvalidField for a port of %j', async (port) => {
        const { load } = edgeProjectWith({ ...EDGE_MINIMAL, port });

        await expect(load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigInvalidField,
            message: expect.stringContaining('port') as string
        });
    });
});

describe('ProjectLoader make', () => {
    it('reads templates from ./templates beside the config with no helpers by default', async () => {
        const { projectDir, load } = projectWith(MINIMAL);

        const { make } = await load();

        expect(make).toEqual({ templates: resolve(projectDir, 'templates'), helpers: {} });
    });

    it('resolves make.templates against the config folder and keeps make.helpers', async () => {
        const shout = (value: string): string => value.toUpperCase();
        const { projectDir, load } = projectWith({ ...MINIMAL, make: { templates: './tpl', helpers: { shout } } });

        const { make } = await load();

        expect(make).toEqual({ templates: resolve(projectDir, 'tpl'), helpers: { shout } });
    });

    it.each([
        ['make', 'templates'],
        ['make.templates', { templates: 3 }],
        ['make.helpers', { helpers: 'shout' }],
        ['make.helpers.shout', { helpers: { shout: 'loud' } }],
        ['make.helpers.pascal', { helpers: { pascal: (text: string) => text } }],
        ['make.helpers.name', { helpers: { name: (text: string) => text } }],
        ['make.helpers.each', { helpers: { each: (text: string) => text } }]
    ])('throws CliConfigInvalidField naming %s for a malformed make', async (field, make) => {
        const { load } = projectWith({ ...MINIMAL, make });

        await expect(load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigInvalidField,
            message: expect.stringContaining(field) as string
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
            message: expect.stringContaining('handlers/a#b.ts') as string
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

        await expect(new ProjectLoader(open, new ShellMode()).readConfig(tempProject())).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigNotFound
        });
    });

    it('closes the module loader when the config is invalid', async () => {
        const projectDir = tempProject();
        writeFileSync(join(projectDir, 'seedcord.config.ts'), '');
        const modules = stubModulesExporting({ build: { start: './index.ts' } });

        await expect(new ProjectLoader(modules.open, new ShellMode()).readConfig(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigInvalidField
        });
        expect(modules.loaders).toEqual([{ loads: 'config', closed: true }]);
    });

    it('closes the config loader once the project opens, and the bot loader and root with the project', async () => {
        const projectDir = tempProject();
        writeFileSync(join(projectDir, 'seedcord.config.ts'), '');
        const modules = stubModulesExporting(MINIMAL);

        {
            await using project = await openProject(new ProjectLoader(modules.open, new ShellMode()), projectDir);
            expect(modules.loaders).toEqual([
                { loads: 'config', closed: true },
                { loads: 'bot', closed: false }
            ]);
            expect(project.config.instance).toBe(resolve(projectDir, 'bot.ts'));
            expect(() => botFolder('.')).not.toThrow();
        }

        expect(modules.loaders).toEqual([
            { loads: 'config', closed: true },
            { loads: 'bot', closed: true }
        ]);
        expect(() => botFolder('.')).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreDirectoryRootUnknown })
        );
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
        await expect(projectWith({ build: { start: './index.ts' } }).load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigInvalidField,
            message: expect.stringContaining('instance in the seedcord config') as string
        });
    });

    it('resolves an export build when build.start is unset', async () => {
        const { projectDir, load } = projectWith({ instance: './bot.ts' });

        const { target } = await load();

        expect(target).toEqual({ kind: 'server', start: undefined, outDir: resolve(projectDir, 'dist') });
    });

    it('rejects an empty build.start', async () => {
        await expect(projectWith({ instance: './bot.ts', build: { start: '' } }).load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigInvalidField,
            message: expect.stringContaining('build.start in the seedcord config') as string
        });
    });

    it('reports every missing and invalid field at once', async () => {
        const error: unknown = await projectWith({ tunnel: 'yes', build: { outDir: 1 } })
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

    it('rejects vitePlugins written as an array', async () => {
        await expect(projectWith({ ...MINIMAL, vitePlugins: [{ name: 'yaml' }] }).load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigInvalidField,
            message: expect.stringContaining('() => [yaml()]') as string
        });
    });
});

describe('ProjectLoader files', () => {
    it('lists no folders when the config leaves files out', async () => {
        const { files } = await projectWith(MINIMAL).load();

        expect(files).toEqual([]);
    });

    it('resolves a relative folder against root and keeps an absolute one', async () => {
        const projectDir = tempProject();
        writeFileSync(join(projectDir, 'seedcord.config.ts'), '');
        const tags = join(projectDir, 'src', 'tags');
        const { open } = stubModulesExporting({ ...MINIMAL, root: './src', files: ['./locales', tags] });

        await using loaded = await new ProjectLoader(open, new ShellMode()).readConfig(projectDir);

        expect(loaded.config.files).toEqual([join(projectDir, 'src', 'locales'), tags]);
    });

    it('loads a folder beside root inside the folder that holds the config', async () => {
        const { files, configFile } = await projectWith({ ...MINIMAL, root: './src', files: ['../shared'] }).load();

        expect(files).toEqual([join(dirname(configFile), 'shared')]);
    });

    it('throws CliListedFolderUnusable for a folder outside the folder that holds the config', async () => {
        const load = projectWith({ ...MINIMAL, root: './src', files: ['../../shared'] }).load();

        await expect(load).rejects.toMatchObject({
            code: SeedcordErrorCode.CliListedFolderUnusable,
            message: expect.stringContaining('outside the folder that holds seedcord.config.ts') as string
        });
    });

    it('throws CliConfigOutDirDeletesRoot for an outDir that holds root, the way seedcord dev loads it', async () => {
        const load = projectWith({ ...MINIMAL, root: './src', build: { ...MINIMAL.build, outDir: '.' } }).load();

        await expect(load).rejects.toMatchObject({ code: SeedcordErrorCode.CliConfigOutDirDeletesRoot });
    });

    it('throws CoreDirectorySkipped for a folder inside a dot-folder', async () => {
        const load = projectWith({ ...MINIMAL, files: ['./.drafts/locales'] }).load();

        await expect(load).rejects.toMatchObject({ code: SeedcordErrorCode.CoreDirectorySkipped });
    });

    it.each([['./locales'], [['./locales', 3]]])('rejects files set to %j', async (files) => {
        await expect(projectWith({ ...MINIMAL, files }).load()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigInvalidField,
            message: expect.stringContaining('files in the seedcord config') as string
        });
    });
});
