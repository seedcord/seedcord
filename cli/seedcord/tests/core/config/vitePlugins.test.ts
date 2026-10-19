import { stripVTControlCharacters } from 'node:util';

import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { assert, describe, expect, it } from 'vite-plus/test';

import { rethrowVitePluginError, wrapVitePlugins } from '#core/config/vitePlugins';

import type { Plugin } from 'vite';

const CONFIG_FILE = '/bot/seedcord.config.ts';

function onlyPlugin(plugin: Plugin): Plugin {
    const [resolved] = wrapVitePlugins([plugin], CONFIG_FILE);
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
        const plugin = onlyPlugin({ name: 'shop-loader', buildStart: () => Promise.reject(thrown) });

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
        const plugin = onlyPlugin({
            name: 'shop-loader',
            [hook]: () => {
                throw new Error('bad yaml on line 3');
            }
        });

        const caught = await rethrownFrom(() => callHook(plugin[hook], [...args]));

        expect(messageOf(caught)).toContain(`its ${hook} hook while loading src/shop.yaml`);
    });

    it('reports the plugin that threw when the plugin object is frozen', async () => {
        const plugin = onlyPlugin(
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
        const plugin = onlyPlugin({
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
        const plugin = onlyPlugin({
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
        const plugin = onlyPlugin({
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

describe('wrapVitePlugins', () => {
    it("passes vite's plugin context through as this", async () => {
        const plugin = onlyPlugin({
            name: 'reads-this',
            config(this: { meta: { viteVersion: string } }) {
                return { define: { VERSION: this.meta.viteVersion } };
            }
        });

        await expect(callHook(plugin.config, [], { meta: { viteVersion: '8.3.4' } })).resolves.toEqual({
            define: { VERSION: '8.3.4' }
        });
    });

    it('returns a plugin with none of the wrapped hooks as the same object', () => {
        const native = { name: 'native', hotUpdate: (): undefined => undefined };

        const [resolved] = wrapVitePlugins([native], CONFIG_FILE);

        expect(resolved).toBe(native);
    });
});
