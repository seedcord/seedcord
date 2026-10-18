import { isPlainObject } from '@seedcord/utils/internal';
import { recordThrownBy, vitePluginThrew } from '@seedcord/utils/node/internal';

import type { Plugin } from 'vite';

// a throw from one of these reaches a startup or an import
const WRAPPED_HOOKS = [
    'config',
    'configEnvironment',
    'configResolved',
    'configureServer',
    'buildStart',
    'resolveId',
    'load',
    'transform'
] as const satisfies readonly (keyof Plugin)[];

type WrappedHook = (typeof WRAPPED_HOOKS)[number];
type HookFunction = (...args: unknown[]) => unknown;
type RecordThrow = (caught: unknown, args: unknown[]) => Error;

function isHookFunction(value: unknown): value is HookFunction {
    return typeof value === 'function';
}

// load(id) and transform(code, id)
function moduleIdOf(hook: WrappedHook, args: unknown[]): string | undefined {
    const id = hook === 'load' ? args[0] : hook === 'transform' ? args[1] : undefined;
    return typeof id === 'string' ? id : undefined;
}

function rethrowing(hook: HookFunction, record: RecordThrow): HookFunction {
    return function (this: unknown, ...args: unknown[]): unknown {
        try {
            const result = Reflect.apply(hook, this, args);
            if (!(result instanceof Promise)) return result;
            return result.catch((caught: unknown) => {
                throw record(caught, args);
            });
        } catch (caught) {
            throw record(caught, args);
        }
    };
}

// a hook is a function, or an object holding one in handler
function wrapHook(hook: unknown, record: RecordThrow): unknown {
    if (isHookFunction(hook)) return rethrowing(hook, record);
    if (isPlainObject(hook) && isHookFunction(hook.handler))
        return { ...hook, handler: rethrowing(hook.handler, record) };
    return hook;
}

function withThrownByOnErrors(plugin: Plugin, configFile: string): Plugin {
    const hooks = WRAPPED_HOOKS.filter((hook) => hook in plugin);
    if (hooks.length === 0) return plugin;

    const prototype = Object.getPrototypeOf(plugin) as object | null;
    // justified: a copy with the same prototype and own properties is the same kind of plugin
    const copy = Object.create(prototype, Object.getOwnPropertyDescriptors(plugin)) as Plugin;
    for (const hook of hooks) {
        const record: RecordThrow = (caught, args) =>
            recordThrownBy(caught, { plugin: plugin.name, hook, configFile, id: moduleIdOf(hook, args) });
        Reflect.set(copy, hook, wrapHook(Reflect.get(plugin, hook), record));
    }
    return copy;
}

export interface VitePluginEntry {
    // the path to it in the config, like vitePlugins[1][0]
    field: string;
    value: unknown;
}

async function flattenAt(options: readonly unknown[], field: string): Promise<VitePluginEntry[]> {
    const nested = await Promise.all(
        options.map(async (option, index) => {
            const at = `${field}[${String(index)}]`;
            const value: unknown = await option;
            if (!value) return [];
            if (Array.isArray(value)) return flattenAt(value, at);
            return [{ field: at, value }];
        })
    );
    return nested.flat();
}

export function flattenVitePlugins(options: readonly unknown[]): Promise<VitePluginEntry[]> {
    return flattenAt(options, 'vitePlugins');
}

export function isVitePlugin(value: unknown): value is Plugin {
    return typeof value === 'object' && value !== null && typeof Reflect.get(value, 'name') === 'string';
}

export function wrapVitePlugins(plugins: readonly Plugin[], configFile: string): Plugin[] {
    return plugins.map((plugin) => withThrownByOnErrors(plugin, configFile));
}

export function rethrowVitePluginError(error: unknown): never {
    throw vitePluginThrew(error) ?? error;
}
