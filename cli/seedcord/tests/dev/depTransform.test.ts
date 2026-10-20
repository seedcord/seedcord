import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createServer, createServerModuleRunner } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { serverViteConfig } from '#commands/dev/runtime/devServerConfig';
import { botEnvironment } from '#core/modules/botEnvironment';
import { mergeViteConfig } from '#core/modules/userCodeConfig';
import { ProjectFiles } from '#core/project/ProjectFiles';
import { realPath } from '#core/project/realPath';

import type { ViteDevServer } from 'vite';

const LOADER_PACKAGE = '@seedcord/fixture-loader';

// importFiles imports through a file url too
const LOADER_ENTRY = `import { pathToFileURL } from 'node:url';

export async function loadFile(absolutePath) {
    return import(pathToFileURL(absolutePath).href);
}
`;

const PROJECT_ENTRY = `import { loadFile } from '${LOADER_PACKAGE}';

export async function run(absolutePath: string): Promise<string[]> {
    return Object.keys(await loadFile(absolutePath));
}
`;

// node's loader rejects every one of these
const HANDLERS = {
    'decorator.ts': `function SlashRoute(name: string) {
    return function (target: unknown): void {
        void name;
        void target;
    };
}

@SlashRoute('ping')
export class Ping {}
`,
    'enum.ts': `export enum Colour {
    Red,
    Blue
}
`,
    'parameterProperty.ts': `export class Service {
    constructor(private readonly name: string) {}
}
`,
    'extensionlessImport.ts': `import { value } from '../lib/util';

export const doubled: number = value * 2;
`
};

async function writeFixture(root: string): Promise<void> {
    const loaderDir = join(root, 'node_modules', LOADER_PACKAGE);
    await mkdir(loaderDir, { recursive: true });
    await mkdir(join(root, 'src', 'handlers'), { recursive: true });
    await mkdir(join(root, 'src', 'lib'), { recursive: true });

    await writeFile(join(root, 'package.json'), '{ "name": "fixture", "type": "module", "private": true }');
    await writeFile(
        join(root, 'tsconfig.json'),
        '{ "compilerOptions": { "target": "ESNext", "experimentalDecorators": true } }'
    );
    await writeFile(
        join(loaderDir, 'package.json'),
        `{ "name": "${LOADER_PACKAGE}", "type": "module", "version": "1.0.0", "exports": "./index.mjs" }`
    );
    await writeFile(join(loaderDir, 'index.mjs'), LOADER_ENTRY);
    await writeFile(join(root, 'src', 'entry.ts'), PROJECT_ENTRY);
    await writeFile(join(root, 'src', 'lib', 'util.ts'), 'export const value = 21;\n');

    for (const [name, source] of Object.entries(HANDLERS)) {
        await writeFile(join(root, 'src', 'handlers', name), source);
    }
}

describe('dev runtime module resolution', () => {
    let root: string;
    let server: ViteDevServer;
    let run: (path: string) => Promise<string[]>;

    beforeAll(async () => {
        root = await mkdtemp(join(tmpdir(), 'seedcord-dev-'));
        await writeFixture(root);

        const config = {
            root: realPath(join(root, 'src')),
            configFile: realPath(join(root, 'seedcord.config.ts')),
            files: [],
            target: { kind: 'server', start: undefined, outDir: realPath(join(root, 'dist')) }
        } as const;
        server = await createServer(
            mergeViteConfig(serverViteConfig(config, new ProjectFiles({ ...config, files: [] }).layout), {
                server: { hmr: false, watch: null }
            })
        );

        const runner = createServerModuleRunner(botEnvironment(server.environments));
        ({ run } = await runner.import<{ run: (path: string) => Promise<string[]> }>('/src/entry.ts'));
    }, 30_000);

    afterAll(async () => {
        await server.close();
        await rm(root, { recursive: true, force: true });
    });

    it.for(Object.keys(HANDLERS))(
        'runs a @seedcord dependency through vite so its dynamic import loads %s',
        async (handler) => {
            await expect(run(join(root, 'src', 'handlers', handler))).resolves.not.toHaveLength(0);
        }
    );
});
