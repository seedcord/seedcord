import { chmod, mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { createServer } from 'vite';
import { describe, expect, it, onTestFinished } from 'vitest';

import { ProjectFiles } from '#core/project/ProjectFiles';
import { realPath } from '#core/project/realPath';

import type { RealPath } from '#core/project/realPath';

async function projectRoot(): Promise<RealPath> {
    const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-files-'));
    onTestFinished(() => tmp.remove());
    return realPath(tmp.path);
}

function filesUnder(root: RealPath): ProjectFiles {
    return ProjectFiles.of({
        root,
        configFile: realPath(join(root, 'seedcord.config.ts')),
        files: [],
        target: { kind: 'server', start: undefined, outDir: realPath(join(root, 'dist')) }
    });
}

// import.meta.glob's output lists each match as a "./key": entry, relative to base
async function globKeys(root: string, globs: string[]): Promise<string[]> {
    await writeFile(
        join(root, '.probe.ts'),
        `export default import.meta.glob(${JSON.stringify(globs)}, { base: '/' });\n`
    );
    const server = await createServer({ root, configFile: false, logLevel: 'silent', server: { watch: null } });
    onTestFinished(() => server.close());
    const transformed = await server.transformRequest('/.probe.ts');
    const keys = [...(transformed?.code ?? '').matchAll(/"\.?(\/[^"]+)":/g)].map(([, key]) => key ?? '');
    expect(keys).not.toEqual([]);
    return keys.toSorted();
}

describe('the build globs', () => {
    it('match the files the layout says belong to the bot', async () => {
        const root = await projectRoot();
        const tree = [
            'handlers/Ping.ts',
            'handlers/Dice.tsx',
            'handlers/types.d.ts',
            'handlers/.drafts/Draft.ts',
            'node_modules/pkg/index.js',
            'dist/index.mjs',
            'logs/today.log',
            'src/dist/shape.ts',
            'seedcord.config.ts',
            'package.json',
            'tsconfig.build.json',
            'bun.lock',
            'locales/package.json',
            'locales/en.json',
            'locales/theme.ts',
            'locales/.cache/stale.json',
            'locales/node_modules/pkg/data.json'
        ];
        for (const file of tree) {
            await mkdir(join(root, file, '..'), { recursive: true });
            await writeFile(join(root, file), '{}\n');
        }
        const files = ProjectFiles.of({
            root,
            configFile: realPath(join(root, 'seedcord.config.ts')),
            files: [realPath(join(root, 'locales'))],
            target: { kind: 'server', start: undefined, outDir: realPath(join(root, 'dist')) }
        });
        const { layout } = files;
        const listed = tree.map((file) => join(root, file)).filter((file) => layout.isListedFile(file));
        const modules = await files.modulePaths();

        await expect(globKeys(root, layout.moduleGlobs())).resolves.toEqual(modules.map((file) => layout.keyOf(file)));
        await expect(globKeys(root, layout.listedFileGlobs())).resolves.toEqual(
            listed.map((file) => layout.keyOf(file)).toSorted()
        );
    });
});

describe('ProjectFiles', () => {
    // the bot and its plugins run between the load checks and the bundle
    it('lists a folder created after the # check ran', async () => {
        const root = await projectRoot();
        const files = filesUnder(root);

        await files.pathsWithHash();
        await mkdir(join(root, 'made-on-load'));

        await expect(files.foldersIncludingEmpty()).resolves.toContain('/made-on-load');
    });

    it('skips a project file written beside the config after the layout was read', async () => {
        const root = await projectRoot();
        const { layout } = filesUnder(root);

        await writeFile(join(root, 'tsconfig.json'), '{}\n');

        expect(layout.isSkipped(join(root, 'tsconfig.json'))).toBe(true);
    });

    // root reads a folder whatever its mode.
    // windows ignores the posix mode bits.
    it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
        'throws CorePathUnreadable for a folder it cannot read',
        async () => {
            const root = await projectRoot();
            const locked = join(root, 'locked');
            await mkdir(locked);
            await chmod(locked, 0o000);
            onTestFinished(() => chmod(locked, 0o700));

            await expect(filesUnder(root).pathsWithHash()).rejects.toMatchObject({
                code: SeedcordErrorCode.CorePathUnreadable,
                message: expect.stringContaining('locked') as string
            });
        }
    );
});
