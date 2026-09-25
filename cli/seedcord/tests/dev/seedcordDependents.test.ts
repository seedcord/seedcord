import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { seedcordDependents } from '#commands/dev/runtime/seedcordDependents';

async function writeManifest(dir: string, manifest: object): Promise<void> {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify(manifest));
}

describe('seedcordDependents', () => {
    let root: string;

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    it('lists a dependency that depends on or peers on a @seedcord package', async () => {
        root = await mkdtemp(join(tmpdir(), 'seedcord-dependents-'));
        await writeManifest(root, {
            dependencies: { peering: '1.0.0', depending: '1.0.0', plain: '1.0.0', '@seedcord/gateway': '1.0.0' },
            devDependencies: { 'dev-plugin': '1.0.0', missing: '1.0.0' }
        });
        await writeManifest(join(root, 'node_modules', 'peering'), { peerDependencies: { '@seedcord/core': '*' } });
        await writeManifest(join(root, 'node_modules', 'depending'), { dependencies: { '@seedcord/gateway': '*' } });
        await writeManifest(join(root, 'node_modules', 'plain'), { dependencies: { unstorage: '*' } });
        await writeManifest(join(root, 'node_modules', 'dev-plugin'), { peerDependencies: { '@seedcord/core': '*' } });
        await writeManifest(join(root, 'node_modules', '@seedcord', 'gateway'), {
            dependencies: { '@seedcord/core': '*' }
        });

        expect(seedcordDependents(root).toSorted()).toEqual(['depending', 'dev-plugin', 'peering']);
    });

    it('follows a seedcord dependent down to the plugins it depends on', async () => {
        root = await mkdtemp(join(tmpdir(), 'seedcord-dependents-'));
        const bundle = join(root, 'node_modules', 'bundle');
        await writeManifest(root, { dependencies: { bundle: '1.0.0' } });
        await writeManifest(bundle, { dependencies: { '@seedcord/core': '*', 'inner-plugin': '1.0.0' } });
        await writeManifest(join(bundle, 'node_modules', 'inner-plugin'), {
            peerDependencies: { '@seedcord/core': '*' }
        });

        expect(seedcordDependents(root).toSorted()).toEqual(['bundle', 'inner-plugin']);
    });

    it('lists every package in a dependency cycle that reaches a @seedcord package', async () => {
        root = await mkdtemp(join(tmpdir(), 'seedcord-dependents-'));
        await writeManifest(root, { dependencies: { a: '1.0.0', wrapper: '1.0.0' } });
        await writeManifest(join(root, 'node_modules', 'a'), {
            dependencies: { wrapper: '1.0.0', '@seedcord/core': '*' }
        });
        await writeManifest(join(root, 'node_modules', 'wrapper'), { dependencies: { a: '1.0.0' } });

        expect(seedcordDependents(root).toSorted()).toEqual(['a', 'wrapper']);
    });

    it('finds a dependency hoisted to a parent node_modules', async () => {
        root = await mkdtemp(join(tmpdir(), 'seedcord-dependents-'));
        const bot = join(root, 'apps', 'bot');
        await writeManifest(bot, { dependencies: { hoisted: '1.0.0' } });
        await writeManifest(join(root, 'node_modules', 'hoisted'), { peerDependencies: { '@seedcord/core': '*' } });

        expect(seedcordDependents(bot)).toEqual(['hoisted']);
    });
});
