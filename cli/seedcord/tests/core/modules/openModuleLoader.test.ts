import { mkdir, mkdtempDisposable, symlink, writeFile } from 'node:fs/promises';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { assert, describe, expect, it, onTestFinished, vi } from 'vitest';

import { openModuleLoader } from '#core/modules/openModuleLoader';

import type { BuildTarget } from '#core/config/detectTarget';

const NODE: BuildTarget = { kind: 'node' };

function edgeTarget(root: string): BuildTarget {
    return { kind: 'edge', wranglerConfig: join(root, 'wrangler.jsonc') };
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
    await mkdir(join(root, 'node_modules'), { recursive: true });
    await symlink(join(import.meta.dirname, '../../../node_modules/envapt'), join(root, 'node_modules', 'envapt'));
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

// vite's default hmr websocket port
const VITE_HMR_PORT = 24_678;

// a dev server in another test worker may already hold it
async function holdPort(port: number): Promise<void> {
    const holder = createNetServer();
    await new Promise<void>((resolve) => {
        holder.once('error', () => resolve());
        holder.listen(port, () => resolve());
    });
    onTestFinished(() => new Promise<void>((resolve) => holder.close(() => resolve())));
}

describe('openModuleLoader', () => {
    it('opens no hmr websocket while another process holds its port', async () => {
        await holdPort(VITE_HMR_PORT);
        const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const root = await project();

        await using modules = await openModuleLoader(root, NODE);
        await modules.importModule(await writeEntry(root, './lib/greeting'));

        expect(logged).not.toHaveBeenCalled();
    });

    it('resolves an import through a tsconfig paths alias', async () => {
        const root = await project({ paths: { '#lib/*': ['./src/lib/*'] } });
        const entry = await writeEntry(root, '#lib/greeting');

        await using modules = await openModuleLoader(root, NODE);
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

        await using modules = await openModuleLoader(root, NODE);
        const module = await modules.importModule<{ value: string }>(entry);

        expect(module.value).toBe('b');
    });

    it('loads a seedcord.config.mts', async () => {
        const root = await project();
        const config = join(root, 'seedcord.config.mts');
        await writeFile(config, `export default { instance: './bot.ts' } satisfies object;\n`, 'utf8');

        await using modules = await openModuleLoader(root, NODE);
        const module = await modules.importModule<{ default: unknown }>(config);

        expect(module.default).toEqual({ instance: './bot.ts' });
    });

    it('throws CliEntryNotFound for a file that does not exist', async () => {
        const root = await project();

        await using modules = await openModuleLoader(root, NODE);

        await expect(modules.importModule(join(root, 'src', 'missing.ts'))).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEntryNotFound
        });
    });

    it('throws CliImportFailed with the reason when a module throws while it loads', async () => {
        const root = await project();
        const entry = join(root, 'src', 'broken.ts');
        await writeFile(entry, `throw new Error('top level boom');\n`, 'utf8');

        await using modules = await openModuleLoader(root, NODE);
        const caught: unknown = await modules.importModule(entry).catch((error: unknown) => error);

        assert(isSeedcordError(caught));
        expect(caught.code).toBe(SeedcordErrorCode.CliImportFailed);
        expect(caught.message).toContain('top level boom');
    });

    it('throws CliPathHasHash for a file whose path contains a #', async () => {
        const root = join(await project(), 'hash#bot');
        await mkdir(root);
        const entry = join(root, 'entry.ts');
        await writeFile(entry, `export const value = 'hi';\n`, 'utf8');

        await using modules = await openModuleLoader(root, NODE);

        await expect(modules.importModule(entry)).rejects.toMatchObject({ code: SeedcordErrorCode.CliPathHasHash });
    });

    it('resolves a relative import with no paths declared', async () => {
        const root = await project();
        const entry = await writeEntry(root, './lib/greeting');

        await using modules = await openModuleLoader(root, NODE);
        const module = await modules.importModule<{ value: string }>(entry);

        expect(module.value).toBe('hi');
    });
});

describe('openModuleLoader for an edge bot', () => {
    it.each(['fixture-runtime', '@seedcord/fixture-runtime'])(
        "picks %s's workerd export on edge and its import export on node",
        async (name) => {
            const root = await edgeProject();
            await writeRuntimePackage(root, name);
            const entry = await writeModule(root, `export { default } from '${name}';\n`);

            await using onNode = await openModuleLoader(root, NODE);
            await using onEdge = await openModuleLoader(root, edgeTarget(root));
            const fromNode = await onNode.importModule<{ default: string }>(entry);
            const fromEdge = await onEdge.importModule<{ default: string }>(entry);

            expect(fromNode.default).toBe('node');
            expect(fromEdge.default).toBe('edge');
        }
    );

    it('loads cloudflare:workers with process.env as its env', async () => {
        vi.stubEnv('SEEDCORD_PROBE', 'from the shell');
        const root = await edgeProject();
        const entry = await writeModule(
            root,
            `import { env } from 'cloudflare:workers';\nexport const probe = env.SEEDCORD_PROBE;\n`
        );

        await using modules = await openModuleLoader(root, edgeTarget(root));
        const module = await modules.importModule<{ probe: string }>(entry);

        expect(module.probe).toBe('from the shell');
    });

    it('throws CliImportFailed for an edge bot without envapt installed', async () => {
        const root = await project();

        await expect(openModuleLoader(root, edgeTarget(root))).rejects.toMatchObject({
            code: SeedcordErrorCode.CliImportFailed,
            message: expect.stringContaining('envapt') as string
        });
    });

    it("binds envapt's workerd build to process.env", async () => {
        vi.stubEnv('SEEDCORD_PROBE', 'from the shell');
        const root = await edgeProject();
        const entry = await writeModule(
            root,
            `import { Envapter } from 'envapt';\nexport const probe = Envapter.get('SEEDCORD_PROBE');\n`
        );

        await using modules = await openModuleLoader(root, edgeTarget(root));
        const module = await modules.importModule<{ probe: string }>(entry);

        expect(module.probe).toBe('from the shell');
    });
});
