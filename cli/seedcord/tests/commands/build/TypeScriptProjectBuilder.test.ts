import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { afterAll, describe, expect, it } from 'vitest';

import { TypeScriptProjectBuilder } from '@commands/build/builder/TypeScriptProjectBuilder';

import { silentLogger } from '../../silentLogger';

import type { ResolvedSeedcordDevConfig } from '@core/config/schema';

// the project has to sit inside the repo so its tsc and its node resolution both walk up to the workspace
const SCRATCH_ROOT = join(import.meta.dirname, '.build-fixture');

const run = promisify(execFile);

const TSCONFIG = {
    compilerOptions: {
        target: 'es2022',
        module: 'esnext',
        moduleResolution: 'bundler',
        strict: true,
        paths: { '@lib/*': ['./src/lib/*'] },
        rootDir: './src',
        outDir: './dist'
    },
    include: ['src/**/*.ts']
};

async function writeProject(dir: string): Promise<void> {
    await mkdir(join(dir, 'src', 'lib'), { recursive: true });
    await mkdir(join(dir, 'src', 'sub'), { recursive: true });

    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'fixture', type: 'module' }));
    await writeFile(join(dir, 'tsconfig.json'), JSON.stringify(TSCONFIG));
    await writeFile(join(dir, 'seedcord.config.ts'), 'export default {};\n');

    await writeFile(join(dir, 'src', 'lib', 'util.ts'), 'export const aliased = (): string => "aliased";\n');
    await writeFile(join(dir, 'src', 'sub', 'index.ts'), 'export const fromSub = (): string => "sub";\n');
    await writeFile(join(dir, 'src', 'helper.ts'), 'export const helper = (): string => "helper";\n');
    await writeFile(
        join(dir, 'src', 'index.ts'),
        [
            "import { aliased } from '@lib/util';",
            "import { fromSub } from './sub';",
            '',
            'export async function main(): Promise<string> {',
            "    const lazy = await import('./helper');",
            '    return [aliased(), fromSub(), lazy.helper()].join("|");',
            '}',
            ''
        ].join('\n')
    );
}

// the builder reads only these five fields
function configFor(dir: string): ResolvedSeedcordDevConfig {
    return {
        configFile: join(dir, 'seedcord.config.ts'),
        root: join(dir, 'src'),
        entry: join(dir, 'src', 'index.ts'),
        build: { outDir: join(dir, 'dist'), tsconfig: join(dir, 'tsconfig.json') }
    } as unknown as ResolvedSeedcordDevConfig;
}

describe('building a project that declares tsconfig paths', () => {
    const dirs: string[] = [];

    afterAll(async () => {
        await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
        await rm(SCRATCH_ROOT, { recursive: true, force: true });
    });

    it('emits output node can import, with every alias and extension resolved', async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'proj-'));
        dirs.push(dir);

        await writeProject(dir);

        const result = await new TypeScriptProjectBuilder(silentLogger).build(configFor(dir));

        // vite resolves an extensionless specifier
        const entry = pathToFileURL(result.emittedEntry).href;
        const { stdout } = await run(process.execPath, [
            '--input-type=module',
            '-e',
            `const m = await import(${JSON.stringify(entry)}); process.stdout.write(await m.main());`
        ]);

        expect(stdout).toBe('aliased|sub|helper');
    }, 60_000);
});
