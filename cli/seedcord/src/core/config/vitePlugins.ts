import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError, isPlainObject } from '@seedcord/utils/internal';

import type { ResolvedSeedcordConfig, VitePlugin } from './schema';
import type { setVitePlugins } from '@seedcord/utils/node/internal';
import type { Plugin, PluginOption, Rolldown } from 'vite';

// vite sets plugin and hook only on errors from the hooks that load modules
const STARTUP_HOOKS = [
    'config',
    'configEnvironment',
    'configResolved',
    'configureServer',
    'buildStart'
] as const satisfies readonly (keyof Plugin)[];

type HookFunction = (...args: unknown[]) => unknown;
type MarkFailure = (caught: unknown) => Error;

// the fields rolldown sets on each error it collects
type PluginFailure = Error & Required<Pick<Rolldown.RolldownError, 'plugin' | 'hook'>>;

type PluginSource = Pick<ResolvedSeedcordConfig, 'configFile' | 'vitePlugins'>;

function isHookFunction(value: unknown): value is HookFunction {
    return typeof value === 'function';
}

function rethrowing(hook: HookFunction, mark: MarkFailure): HookFunction {
    return function (this: unknown, ...args: unknown[]): unknown {
        try {
            const result = Reflect.apply(hook, this, args);
            if (!(result instanceof Promise)) return result;
            return result.catch((caught: unknown) => {
                throw mark(caught);
            });
        } catch (caught) {
            throw mark(caught);
        }
    };
}

// a hook is a function, or an object holding one in handler
function wrapHook(hook: unknown, mark: MarkFailure): unknown {
    if (isHookFunction(hook)) return rethrowing(hook, mark);
    if (isPlainObject(hook) && isHookFunction(hook.handler))
        return { ...hook, handler: rethrowing(hook.handler, mark) };
    return hook;
}

function withPluginOnErrors(plugin: VitePlugin): VitePlugin {
    const hooks = STARTUP_HOOKS.filter((hook) => hook in plugin);
    if (hooks.length === 0) return plugin;

    const prototype = Object.getPrototypeOf(plugin) as object | null;
    // justified: a copy with the same prototype and own properties is the same kind of plugin
    const copy = Object.create(prototype, Object.getOwnPropertyDescriptors(plugin)) as VitePlugin;
    for (const hook of hooks) {
        const mark: MarkFailure = (caught) => {
            const error = asError(caught);
            // Reflect.set leaves a frozen error as it was
            Reflect.set(error, 'plugin', plugin.name);
            Reflect.set(error, 'hook', hook);
            return error;
        };
        Reflect.set(copy, hook, wrapHook(Reflect.get(plugin, hook), mark));
    }
    return copy;
}

async function flatten(option: PluginOption): Promise<VitePlugin[]> {
    const value = await option;
    if (!value) return [];
    if (!Array.isArray(value)) return [value];
    const nested = await Promise.all(value.map(flatten));
    return nested.flat();
}

export async function resolveVitePlugins(options: PluginOption[]): Promise<VitePlugin[]> {
    const plugins = await flatten(options);
    return plugins.map(withPluginOnErrors);
}

function isPluginFailure(value: unknown): value is PluginFailure {
    return (
        Error.isError(value) &&
        typeof Reflect.get(value, 'plugin') === 'string' &&
        typeof Reflect.get(value, 'hook') === 'string'
    );
}

// rolldown's build error lists one error per failed hook
function errorsIn(error: unknown): unknown[] {
    const collected: unknown = Error.isError(error) ? Reflect.get(error, 'errors') : undefined;
    const errors: readonly unknown[] = Array.isArray(collected) ? collected : [];
    return [error, ...errors];
}

export type VitePluginNames = NonNullable<Parameters<typeof setVitePlugins>[0]>;

// the bot checks a failed import against these names
export function vitePluginNames({ configFile, vitePlugins }: PluginSource): VitePluginNames {
    return { configFile, names: vitePlugins.map((plugin) => plugin.name) };
}

export function rethrowWithPluginName({ configFile, vitePlugins }: PluginSource): (error: unknown) => never {
    const names = new Set(vitePlugins.map((plugin) => plugin.name));
    return (error) => {
        const failure = errorsIn(error)
            .filter(isPluginFailure)
            .find(({ plugin }) => names.has(plugin));
        if (!failure) throw error;
        throw new SeedcordError(
            SeedcordErrorCode.CoreVitePluginThrew,
            [failure.plugin, { hook: failure.hook }, configFile, failure.message],
            { cause: failure }
        );
    };
}
