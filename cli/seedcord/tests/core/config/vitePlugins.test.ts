import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { assert, describe, expect, it } from 'vitest';

import { resolveVitePlugins, rethrowWithPluginName } from '#core/config/vitePlugins';

import type { VitePlugin } from '#core/config/schema';
import type { Plugin } from 'vite';

const CONFIG_FILE = '/bot/seedcord.config.ts';

async function onlyPlugin(plugin: VitePlugin): Promise<Plugin> {
    const [resolved] = await resolveVitePlugins([plugin]);
    // justified: every plugin these tests pass carries JS hooks
    return resolved as Plugin;
}

// calls the hook the way vite does, with a context as this
async function callHook(hook: unknown, context: object = {}): Promise<unknown> {
    const handler = typeof hook === 'function' ? hook : (hook as { handler: (...args: unknown[]) => unknown }).handler;
    return await Reflect.apply(handler, context, []);
}

async function caughtFrom(run: () => Promise<unknown>): Promise<unknown> {
    return run().then(
        () => undefined,
        (error: unknown) => error
    );
}

function caughtFromRethrow(error: unknown, vitePlugins: VitePlugin[]): unknown {
    try {
        rethrowWithPluginName({ configFile: CONFIG_FILE, vitePlugins })(error);
    } catch (rethrown) {
        return rethrown;
    }
    return undefined;
}

describe('resolveVitePlugins', () => {
    it('rethrows the error an async startup hook rejects with, carrying the plugin and the hook', async () => {
        const thrown = new Error('no db');
        const plugin = await onlyPlugin({ name: 'rejects', buildStart: () => Promise.reject(thrown) });

        const caught = await caughtFrom(() => callHook(plugin.buildStart));

        expect(caught).toBe(thrown);
        expect(caught).toMatchObject({ plugin: 'rejects', hook: 'buildStart' });
    });

    it('wraps a thrown value that is not an Error', async () => {
        const plugin = await onlyPlugin({
            name: 'throws-a-string',
            config: () => {
                // eslint-disable-next-line no-throw-literal, @typescript-eslint/only-throw-error -- a plugin can throw anything
                throw 'bad option';
            }
        });

        const caught = await caughtFrom(() => callHook(plugin.config));

        expect(caught).toBeInstanceOf(Error);
        expect(caught).toMatchObject({ message: 'bad option', cause: 'bad option', plugin: 'throws-a-string' });
    });

    it('wraps a startup hook written as an object with a handler and keeps its order', async () => {
        const plugin = await onlyPlugin({
            name: 'ordered',
            configResolved: {
                order: 'pre',
                handler: () => {
                    throw new Error('bad config');
                }
            }
        });

        const caught = await caughtFrom(() => callHook(plugin.configResolved));

        expect(plugin.configResolved).toMatchObject({ order: 'pre' });
        expect(caught).toMatchObject({ plugin: 'ordered', hook: 'configResolved' });
    });

    it("passes vite's plugin context through as this", async () => {
        const plugin = await onlyPlugin({
            name: 'reads-this',
            config(this: { meta: { viteVersion: string } }) {
                return { define: { VERSION: this.meta.viteVersion } };
            }
        });

        await expect(callHook(plugin.config, { meta: { viteVersion: '8.3.4' } })).resolves.toEqual({
            define: { VERSION: '8.3.4' }
        });
    });

    it('returns a plugin with no startup hooks as the same object', async () => {
        const native = { name: 'native' };

        const [resolved] = await resolveVitePlugins([native]);

        expect(resolved).toBe(native);
    });

    it('leaves the hooks that load modules to vite', async () => {
        const transform = (): undefined => undefined;

        const plugin = await onlyPlugin({ name: 'transforms', buildStart: () => undefined, transform });

        expect(plugin.transform).toBe(transform);
    });
});

describe('rethrowWithPluginName', () => {
    const yaml = { name: 'yaml' };

    it("throws CoreVitePluginThrew for an error from one of the user's plugins", () => {
        const failed = Object.assign(new Error('bad option'), { plugin: 'yaml', hook: 'config' });

        const caught = caughtFromRethrow(failed, [yaml]);

        assert(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.CoreVitePluginThrew));
        expect(caught.message).toContain('yaml');
        expect(caught.message).toContain('config');
        expect(caught.message).toContain('bad option');
        expect(caught.cause).toBe(failed);
    });

    it("finds the user's plugin among the errors rolldown collects", () => {
        const failed = Object.assign(new Error('bad yaml'), { plugin: 'yaml', hook: 'transform' });
        const bundleError = Object.assign(new Error('Build failed with 1 error'), { errors: [failed] });

        const caught = caughtFromRethrow(bundleError, [yaml]);

        assert(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.CoreVitePluginThrew));
        expect(caught.message).toContain('transform');
    });

    it('rethrows an error from a plugin outside vitePlugins unchanged', () => {
        const failed = Object.assign(new Error('entry broke'), { plugin: 'seedcord:entry', hook: 'load' });

        expect(caughtFromRethrow(failed, [yaml])).toBe(failed);
    });
});
