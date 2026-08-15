import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { ViteDevRuntime } from '@commands/dev/runtime/ViteDevRuntime';

import type { ResolvedSeedcordDevConfig } from '@core/config/schema';

const SCRATCH_ROOT = join(import.meta.dirname, '.build-fixture');

const TSCONFIG = {
    compilerOptions: {
        target: 'es2022',
        module: 'esnext',
        moduleResolution: 'bundler',
        strict: true,
        paths: { '@lib/*': ['./src/lib/*'] }
    },
    include: ['src/**/*.ts']
};

async function writeProject(dir: string): Promise<void> {
    await mkdir(join(dir, 'src', 'lib'), { recursive: true });

    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'dev-fixture', type: 'module' }));
    await writeFile(join(dir, 'tsconfig.json'), JSON.stringify(TSCONFIG));
    await writeFile(join(dir, 'seedcord.config.ts'), 'export default {};\n');
    await writeFile(join(dir, 'src', 'lib', 'util.ts'), 'export const aliased = (): string => "aliased";\n');
    await writeFile(
        join(dir, 'src', 'index.ts'),
        ["import { aliased } from '@lib/util';", '', 'export const value = aliased();', ''].join('\n')
    );
}

// the runtime reads only these three fields on the way to loadEntry
function configFor(dir: string): ResolvedSeedcordDevConfig {
    return {
        configFile: join(dir, 'seedcord.config.ts'),
        root: join(dir, 'src'),
        instance: join(dir, 'src', 'index.ts')
    } as unknown as ResolvedSeedcordDevConfig;
}

describe('dev runtime against a project that declares tsconfig paths', () => {
    const runtimes: ViteDevRuntime[] = [];

    afterAll(async () => {
        await Promise.all(runtimes.map((runtime) => runtime.dispose()));
        await rm(SCRATCH_ROOT, { recursive: true, force: true });
    });

    it('resolves an aliased import through the module runner', async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        await writeProject(dir);

        const runtime = new ViteDevRuntime();
        runtimes.push(runtime);

        await runtime.start({ config: configFor(dir) });
        const { module } = await runtime.loadEntry();

        expect(module).toMatchObject({ value: 'aliased' });
    }, 60_000);
});
