import { stripVTControlCharacters } from 'node:util';

import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { assert, describe, expect, it } from 'vitest';

import { rethrowVitePluginError } from '#core/config/vitePlugins';
import { vitePluginsOf } from '#tests/vitePluginsOf';

import type { Plugin } from 'vite';

const CONFIG_FILE = '/bot/seedcord.config.ts';

async function onlyPlugin(plugin: Plugin): Promise<Plugin> {
    const [resolved] = await vitePluginsOf(() => [plugin], CONFIG_FILE).create();
    assert(resolved);
    return resolved;
}

// calls the hook the way vite does, with a context as this
async function callHook(hook: unknown, args: unknown[] = [], context: object = {}): Promise<unknown> {
    const handler = typeof hook === 'function' ? hook : (hook as { handler: (...args: unknown[]) => unknown }).handler;
    return await Reflect.apply(handler, context, args);
}

// the error a CLI catch site rethrows after a hook throws
async function rethrownFrom(run: () => Promise<unknown>): Promise<unknown> {
    try {
        await run();
    } catch (error) {
        try {
            rethrowVitePluginError(error);
        } catch (rethrown) {
            return rethrown;
        }
    }
    return undefined;
}

function messageOf(error: unknown): string {
    assert(isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.CoreVitePluginThrew));
    return stripVTControlCharacters(error.message);
}

describe('a plugin from vitePlugins that throws', () => {
    it('becomes CoreVitePluginThrew with the plugin, the hook and the config file', async () => {
        const thrown = new Error('no db');
        const plugin = await onlyPlugin({ name: 'shop-loader', buildStart: () => Promise.reject(thrown) });

        const caught = await rethrownFrom(() => callHook(plugin.buildStart));

        const message = messageOf(caught);
        expect(message).toContain('shop-loader');
        expect(message).toContain('its buildStart hook');
        expect(message).toContain(CONFIG_FILE);
        expect(message).toContain('no db');
        expect(caught).toMatchObject({ cause: thrown });
    });

    it.each([
        ['load', [`${process.cwd()}/src/shop.yaml`]],
        ['transform', ['a: 1', `${process.cwd()}/src/shop.yaml?raw`]]
    ] as const)('adds the file it was loading for a throw in %s', async (hook, args) => {
        const plugin = await onlyPlugin({
            name: 'shop-loader',
            [hook]: () => {
                throw new Error('bad yaml on line 3');
            }
        });

        const caught = await rethrownFrom(() => callHook(plugin[hook], [...args]));

        expect(messageOf(caught)).toContain(`its ${hook} hook while loading src/shop.yaml`);
    });

    it('reports the plugin that threw when the plugin object is frozen', async () => {
        const plugin = await onlyPlugin(
            Object.freeze({
                name: 'frozen-loader',
                load: () => {
                    throw new Error('bad yaml');
                }
            })
        );

        const caught = await rethrownFrom(() => callHook(plugin.load, ['/bot/src/shop.yaml']));

        expect(messageOf(caught)).toContain('frozen-loader');
    });

    it('wraps a thrown value that is not an Error', async () => {
        const plugin = await onlyPlugin({
            name: 'shop-loader',
            config: () => {
                // eslint-disable-next-line no-throw-literal, @typescript-eslint/only-throw-error -- a plugin can throw anything
                throw 'bad option';
            }
        });

        const caught = await rethrownFrom(() => callHook(plugin.config));

        expect(messageOf(caught)).toContain('bad option');
    });

    it('wraps a hook written as an object with a handler and keeps its order', async () => {
        const plugin = await onlyPlugin({
            name: 'shop-loader',
            configResolved: {
                order: 'pre',
                handler: () => {
                    throw new Error('bad config');
                }
            }
        });

        const caught = await rethrownFrom(() => callHook(plugin.configResolved));

        expect(plugin.configResolved).toMatchObject({ order: 'pre' });
        expect(messageOf(caught)).toContain('its configResolved hook');
    });

    it('is found among the errors rolldown collects for a build', async () => {
        const plugin = await onlyPlugin({
            name: 'shop-loader',
            transform: () => {
                throw new Error('bad yaml');
            }
        });

        const caught = await rethrownFrom(async () => {
            const failed = await callHook(plugin.transform, ['', '/bot/src/shop.yaml']).catch(
                (error: unknown) => error
            );
            throw Object.assign(new Error('Build failed with 1 error'), { errors: [failed] });
        });

        expect(messageOf(caught)).toContain('shop-loader');
    });
});

describe('rethrowVitePluginError', () => {
    it("rethrows an error from the bot's own code unchanged", async () => {
        const failed = new Error('Unexpected token');

        await expect(rethrownFrom(() => Promise.reject(failed))).resolves.toBe(failed);
    });
});

describe('VitePlugins.create', () => {
    it("passes vite's plugin context through as this", async () => {
        const plugin = await onlyPlugin({
            name: 'reads-this',
            config(this: { meta: { viteVersion: string } }) {
                return { define: { VERSION: this.meta.viteVersion } };
            }
        });

        await expect(callHook(plugin.config, [], { meta: { viteVersion: '8.3.4' } })).resolves.toEqual({
            define: { VERSION: '8.3.4' }
        });
    });

    it('returns a plugin with none of the wrapped hooks as the same object', async () => {
        const native = { name: 'native', hotUpdate: (): undefined => undefined };

        const resolved = await onlyPlugin(native);

        expect(resolved).toBe(native);
    });

    it('throws CliConfigInvalidField that says to call a plugin factory left uncalled', async () => {
        const caught: unknown = await vitePluginsOf(() => [{ name: 'json' }, function yaml() {}], CONFIG_FILE)
            .create()
            .catch((error: unknown) => error);

        assert(isSeedcordError(caught, 'SeedcordTypeError', SeedcordErrorCode.CliConfigInvalidField));
        const message = stripVTControlCharacters(caught.message);
        expect(message).toContain('vitePlugins[1]');
        expect(message).toContain('yaml()');
    });

    it('finds an uncalled factory that a promise inside a nested array resolves to', async () => {
        const vitePlugins = vitePluginsOf(() => [false, [Promise.resolve(function yaml() {})]], CONFIG_FILE);

        await expect(vitePlugins.create()).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigInvalidField,
            message: expect.stringMatching(/vitePlugins\[1\]\[0\][\s\S]*yaml\(\)/) as string
        });
    });

    it.each([['yaml'], [{ transform: () => undefined }]])(
        'throws CliConfigInvalidField for the entry %o that has no plugin name',
        async (entry) => {
            const vitePlugins = vitePluginsOf(() => [entry], CONFIG_FILE);

            await expect(vitePlugins.create()).rejects.toMatchObject({
                code: SeedcordErrorCode.CliConfigInvalidField,
                message: expect.stringContaining('vitePlugins[0]') as string
            });
        }
    );

    it('throws CoreVitePluginThrew with the entry and the reason for an entry whose promise rejects', async () => {
        const missing = new Error("Cannot find package 'yaml-plugin'");
        const vitePlugins = vitePluginsOf(() => [{ name: 'json' }, Promise.reject(missing)], CONFIG_FILE);

        const caught: unknown = await vitePlugins.create().catch((error: unknown) => error);

        assert(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.CoreVitePluginThrew));
        const message = stripVTControlCharacters(caught.message);
        expect(message).toContain('vitePlugins[1]');
        expect(message).toContain("Cannot find package 'yaml-plugin'");
        expect(caught.cause).toBe(missing);
    });
});
