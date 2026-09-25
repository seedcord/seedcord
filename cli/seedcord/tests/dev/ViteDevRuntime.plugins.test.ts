import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import viteConfig from '#commands/dev/runtime/vite.config';
import { ViteDevRuntime } from '#commands/dev/runtime/ViteDevRuntime';

import { devConfigFor } from './devConfigFor';

// stands in for @seedcord/core, whose Plugin stamps a module-level symbol that attach reads back
const CORE_ENTRY = `const slot = Symbol('slot');

export class Base {
    constructor() {
        this[slot] = true;
    }
}

export function isBase(value) {
    return value[slot] === true;
}
`;

const PLUGIN_ENTRY = `import { Base } from '@seedcord/fixture-core';

export class ThirdParty extends Base {}
`;

const REEXPORT_ENTRY = `export { ThirdParty } from 'third-party-plugin';
`;

function botEntry(from: string): string {
    return `import { isBase } from '@seedcord/fixture-core';
import { ThirdParty } from '${from}';

export const sameCore = isBase(new ThirdParty());
`;
}

async function writePackage(root: string, name: string, manifest: object, entry: string): Promise<void> {
    const dir = join(root, 'node_modules', name);
    await mkdir(dir, { recursive: true });
    await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ name, version: '1.0.0', type: 'module', exports: './index.mjs', ...manifest })
    );
    await writeFile(join(dir, 'index.mjs'), entry);
}

// the bot depends on `from` alone and imports the plugin class through it
async function writeProject(from: string): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'seedcord-dev-plugin-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
        join(root, 'package.json'),
        JSON.stringify({ name: 'bot', type: 'module', dependencies: { [from]: '1.0.0' } })
    );
    await writeFile(join(root, 'seedcord.config.ts'), 'export default {};\n');
    await writeFile(join(root, 'src', 'bot.ts'), botEntry(from));

    await writePackage(root, '@seedcord/fixture-core', {}, CORE_ENTRY);
    await writePackage(
        root,
        'third-party-plugin',
        { peerDependencies: { '@seedcord/fixture-core': '*' } },
        PLUGIN_ENTRY
    );
    await writePackage(root, 'plugin-wrapper', { dependencies: { 'third-party-plugin': '1.0.0' } }, REEXPORT_ENTRY);
    await writePackage(
        root,
        '@seedcord/fixture-pack',
        { dependencies: { 'third-party-plugin': '1.0.0' } },
        REEXPORT_ENTRY
    );
    return root;
}

async function withRuntime(
    run: (runtime: ViteDevRuntime) => Promise<void>,
    from = 'third-party-plugin'
): Promise<void> {
    const root = await writeProject(from);
    const runtime = new ViteDevRuntime();
    try {
        await runtime.start({ config: devConfigFor(root, 'bot.ts') });
        await run(runtime);
    } finally {
        await runtime.dispose();
        await rm(root, { recursive: true, force: true });
    }
}

describe('dev runtime against a plugin published outside the @seedcord scope', () => {
    it.for(['third-party-plugin', 'plugin-wrapper', '@seedcord/fixture-pack'])(
        'loads the plugin against the same core the bot imports, reached through %s',
        { timeout: 60_000 },
        async (from) => {
            await withRuntime(async (runtime) => {
                const { module } = await runtime.loadEntry();

                expect(module).toMatchObject({ sameCore: true });
            }, from);
        }
    );

    // a restart in the same process builds its config from this object again
    it('leaves the shared vite config as it found it', async () => {
        const before = structuredClone(viteConfig);

        await withRuntime(async () => {});

        expect(viteConfig).toEqual(before);
    }, 60_000);
});
