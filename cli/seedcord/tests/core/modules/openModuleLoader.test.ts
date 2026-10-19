import { existsSync } from 'node:fs';
import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { afterEach, assert, describe, expect, it, onTestFinished, vi } from 'vitest';

import { importInstance } from '#core/modules/importInstance';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { WorkerEnv } from '#core/modules/workerEnv';
import { realPath } from '#core/project/realPath';
import { cloudflareConfigSource, linkPackages } from '#tests/edgeFolder';
import { holdViteHmrPort } from '#tests/viteHmrPort';
import { vitePluginsOf } from '#tests/vitePluginsOf';

import type { BuildTarget } from '#core/config/detectTarget';
import type { LoaderUse } from '#core/modules/ModuleLoader';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
});

const SERVER: BuildTarget = { kind: 'server' };
const BOT_CODE: LoaderUse = { vitePlugins: vitePluginsOf() };

async function edgeTarget(root: string): Promise<BuildTarget> {
    const cloudflareConfig = join(root, 'cloudflare.config.ts');
    await writeFile(cloudflareConfig, cloudflareConfigSource('SEEDCORD_PROBE: bindings.secret()'));
    await linkPackages(root, ['cf']);
    return { kind: 'edge', cloudflareConfig: realPath(cloudflareConfig), viteRoot: realPath(root) };
}

// a package whose default export reports which build its conditions picked
async function writeRuntimePackage(root: string, name: string): Promise<void> {
    const dir = join(root, 'node_modules', name);
    await mkdir(dir, { recursive: true });
    const exports = { '.': { workerd: './edge.js', import: './node.js' } };
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name, type: 'module', exports }), 'utf8');
    await writeFile(join(dir, 'edge.js'), `export default 'edge';\n`, 'utf8');
    await writeFile(join(dir, 'node.js'), `export default 'node';\n`, 'utf8');
}

// every edge bot installs envapt, a peer of @seedcord/http
async function edgeProject(): Promise<string> {
    const root = await project();
    await linkPackages(root, ['envapt']);
    return root;
}

async function writeModule(root: string, source: string): Promise<string> {
    const entry = join(root, 'src', 'probe.ts');
    await writeFile(entry, source, 'utf8');
    return entry;
}

async function project(options: Record<string, unknown> = {}): Promise<string> {
    const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-loader-'));
    onTestFinished(() => tmp.remove());
    const root = tmp.path;
    const compilerOptions = { module: 'preserve', moduleResolution: 'bundler', ...options };

    await writeFile(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions }), 'utf8');
    await mkdir(join(root, 'src', 'lib'), { recursive: true });
    await writeFile(join(root, 'src', 'lib', 'greeting.ts'), `export const greeting = 'hi';\n`, 'utf8');

    return root;
}

async function writeEntry(root: string, specifier: string): Promise<string> {
    const entry = join(root, 'src', 'entry.ts');
    await writeFile(entry, `import { greeting } from '${specifier}';\nexport const value = greeting;\n`, 'utf8');

    return entry;
}

describe('openModuleLoader', () => {
    it('opens no hmr websocket while another process holds its port', async () => {
        await holdViteHmrPort();
        const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const root = await project();

        await using modules = await openModuleLoader(root, SERVER, 'development', BOT_CODE);
        await modules.importModule(await writeEntry(root, './lib/greeting'));

        expect(logged).not.toHaveBeenCalled();
    });

    it("writes nothing to the project's vite cache", async () => {
        const root = await project();
        await mkdir(join(root, 'node_modules'));

        await using modules = await openModuleLoader(root, SERVER, 'development', BOT_CODE);
        await modules.importModule(await writeEntry(root, './lib/greeting'));

        expect(existsSync(join(root, 'node_modules', '.vite'))).toBe(false);
    });

    it('resolves an import through a tsconfig paths alias', async () => {
        const root = await project({ paths: { '#lib/*': ['./src/lib/*'] } });
        const entry = await writeEntry(root, '#lib/greeting');

        await using modules = await openModuleLoader(root, SERVER, 'development', BOT_CODE);
        const module = await modules.importModule<{ value: string }>(entry);

        expect(module.value).toBe('hi');
    });

    // codegen pulls in whatever a command file imports
    it('follows an extensionless import into a file holding JSX the way its tsconfig compiles it', async () => {
        const root = await project({ jsx: 'react' });
        await writeFile(
            join(root, 'src', 'lib', 'card.tsx'),
            `const React = { createElement: (tag) => tag };\nexport const greeting = <b />;\n`,
            'utf8'
        );
        const entry = await writeEntry(root, './lib/card');

        await using modules = await openModuleLoader(root, SERVER, 'development', BOT_CODE);
        const module = await modules.importModule<{ value: string }>(entry);

        expect(module.value).toBe('b');
    });

    it('loads a seedcord.config.mts', async () => {
        const root = await project();
        const config = join(root, 'seedcord.config.mts');
        await writeFile(config, `export default { instance: './bot.ts' } satisfies object;\n`, 'utf8');

        await using modules = await openModuleLoader(root, SERVER, 'development', BOT_CODE);
        const module = await modules.importModule<{ default: unknown }>(config);

        expect(module.default).toEqual({ instance: './bot.ts' });
    });

    it('throws CoreImportFailed for a file that does not exist', async () => {
        const root = await project();

        await using modules = await openModuleLoader(root, SERVER, 'development', BOT_CODE);

        await expect(modules.importModule(join(root, 'src', 'missing.ts'))).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreImportFailed
        });
    });

    it('throws CliFileNotFound for an instance file that does not exist, pointing at instance', async () => {
        const root = await project();

        await using modules = await openModuleLoader(root, SERVER, 'development', BOT_CODE);

        await expect(importInstance(modules, join(root, 'src', 'missing.ts'))).rejects.toMatchObject({
            code: SeedcordErrorCode.CliFileNotFound,
            message: expect.stringContaining('Point instance in the seedcord config') as string
        });
    });

    it('throws CoreImportFailed with the reason when a module throws while it loads', async () => {
        const root = await project();
        const entry = join(root, 'src', 'broken.ts');
        await writeFile(entry, `throw new Error('top level boom');\n`, 'utf8');

        await using modules = await openModuleLoader(root, SERVER, 'development', BOT_CODE);
        const caught: unknown = await modules.importModule(entry).catch((error: unknown) => error);

        assert(isSeedcordError(caught));
        expect(caught.code).toBe(SeedcordErrorCode.CoreImportFailed);
        expect(caught.message).toContain('top level boom');
    });

    it('throws CliPathHasHash for a file whose path contains a #', async () => {
        const root = join(await project(), 'hash#bot');
        await mkdir(root);
        const entry = join(root, 'entry.ts');
        await writeFile(entry, `export const value = 'hi';\n`, 'utf8');

        await using modules = await openModuleLoader(root, SERVER, 'development', BOT_CODE);

        await expect(modules.importModule(entry)).rejects.toMatchObject({ code: SeedcordErrorCode.CliPathHasHash });
    });

    it('resolves a relative import with no paths declared', async () => {
        const root = await project();
        const entry = await writeEntry(root, './lib/greeting');

        await using modules = await openModuleLoader(root, SERVER, 'development', BOT_CODE);
        const module = await modules.importModule<{ value: string }>(entry);

        expect(module.value).toBe('hi');
    });
});

describe('openModuleLoader for an edge bot', () => {
    it.each(['fixture-runtime', '@seedcord/fixture-runtime'])(
        "picks %s's workerd export on edge and its import export on a server",
        async (name) => {
            const root = await edgeProject();
            await writeRuntimePackage(root, name);
            const entry = await writeModule(root, `export { default } from '${name}';\n`);

            await using onServer = await openModuleLoader(root, SERVER, 'development', BOT_CODE);
            await using onEdge = await openModuleLoader(root, await edgeTarget(root), 'development', BOT_CODE);
            const fromServer = await onServer.importModule<{ default: string }>(entry);
            const fromEdge = await onEdge.importModule<{ default: string }>(entry);

            expect(fromServer.default).toBe('node');
            expect(fromEdge.default).toBe('edge');
        }
    );

    it("loads cloudflare:workers with the shell's value for a declared secret", async () => {
        vi.stubEnv('SEEDCORD_PROBE', 'from the shell');
        const root = await edgeProject();
        const entry = await writeModule(
            root,
            `import { env } from 'cloudflare:workers';\nexport const probe = env.SEEDCORD_PROBE;\n`
        );

        await using modules = await openModuleLoader(root, await edgeTarget(root), 'development', BOT_CODE);
        const module = await modules.importModule<{ probe: string }>(entry);

        expect(module.probe).toBe('from the shell');
    });

    it("loads cloudflare:workers with .env's value for a declared secret", async () => {
        const root = await edgeProject();
        await writeFile(join(root, '.env'), 'SEEDCORD_PROBE=from .env\n', 'utf8');
        const entry = await writeModule(
            root,
            `import { env } from 'cloudflare:workers';\nexport const probe = env.SEEDCORD_PROBE;\n`
        );

        await using modules = await openModuleLoader(root, await edgeTarget(root), 'development', BOT_CODE);
        const module = await modules.importModule<{ probe: string }>(entry);

        expect(module.probe).toBe('from .env');
    });

    it('reads the env from the WorkerEnv it is given', async () => {
        vi.stubEnv('SEEDCORD_PROBE', 'from the shell');
        const root = await edgeProject();
        const target = await edgeTarget(root);
        const workerEnv = await WorkerEnv.load(join(root, 'cloudflare.config.ts'), 'development');
        await writeFile(join(root, 'cloudflare.config.ts'), `throw new Error('loaded a second time');\n`, 'utf8');
        const entry = await writeModule(
            root,
            `import { env } from 'cloudflare:workers';\nexport const probe = env.SEEDCORD_PROBE;\n`
        );

        await using modules = await openModuleLoader(root, target, 'development', BOT_CODE, { watch: {}, workerEnv });
        const module = await modules.importModule<{ probe: string }>(entry);

        expect(module.probe).toBe('from the shell');
    });

    it('loads classes that extend the cloudflare:workers base classes', async () => {
        const root = await edgeProject();
        const entry = await writeModule(
            root,
            [
                "import { DurableObject, WorkerEntrypoint, WorkflowEntrypoint } from 'cloudflare:workers';",
                'export class Counter extends DurableObject {}',
                'export class Api extends WorkerEntrypoint {}',
                'export class Signup extends WorkflowEntrypoint {}',
                ''
            ].join('\n')
        );

        await using modules = await openModuleLoader(root, await edgeTarget(root), 'development', BOT_CODE);
        const module = await modules.importModule<Record<string, unknown>>(entry);

        expect(Object.keys(module).toSorted()).toEqual(['Api', 'Counter', 'Signup']);
    });

    it('throws CoreImportFailed for an edge bot without envapt installed', async () => {
        const root = await project();

        await expect(openModuleLoader(root, await edgeTarget(root), 'development', BOT_CODE)).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreImportFailed,
            message: expect.stringContaining('envapt') as string
        });
    });

    it("binds envapt's workerd build to the worker's env", async () => {
        vi.stubEnv('SEEDCORD_PROBE', 'from the shell');
        const root = await edgeProject();
        const entry = await writeModule(
            root,
            `import { Envapter } from 'envapt';\nexport const probe = Envapter.get('SEEDCORD_PROBE');\n`
        );

        await using modules = await openModuleLoader(root, await edgeTarget(root), 'development', BOT_CODE);
        const module = await modules.importModule<{ probe: string }>(entry);

        expect(module.probe).toBe('from the shell');
    });
});
