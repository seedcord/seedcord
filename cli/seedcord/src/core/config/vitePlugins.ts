import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { asError, isPlainObject } from '@seedcord/utils/internal';
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

    const descriptors: PropertyDescriptorMap = Object.getOwnPropertyDescriptors(plugin);
    for (const hook of hooks) {
        const record: RecordThrow = (caught, args) =>
            recordThrownBy(caught, { plugin: plugin.name, hook, configFile, moduleId: moduleIdOf(hook, args) });
        descriptors[hook] = {
            value: wrapHook(Reflect.get(plugin, hook), record),
            writable: true,
            enumerable: true,
            configurable: true
        };
    }
    const prototype = Object.getPrototypeOf(plugin) as object | null;
    // justified: a copy with the same prototype and own properties is the same kind of plugin
    return Object.create(prototype, descriptors) as Plugin;
}

type VitePluginEntry = { field: string; value: unknown } | { field: string; rejected: unknown };

export type VitePluginProblem = SeedcordError | SeedcordTypeError;

interface VitePluginsRead {
    plugins: Plugin[];
    problems: VitePluginProblem[];
}

async function flattenAt(options: readonly unknown[], field: string): Promise<VitePluginEntry[]> {
    const settled = await Promise.allSettled(options);
    const nested = await Promise.all(
        settled.map(async (result, index): Promise<VitePluginEntry[]> => {
            const at = `${field}[${String(index)}]`;
            if (result.status === 'rejected') return [{ field: at, rejected: result.reason }];
            const value: unknown = result.value;
            if (!value) return [];
            if (Array.isArray(value)) return flattenAt(value, at);
            return [{ field: at, value }];
        })
    );
    return nested.flat();
}

function isVitePlugin(value: unknown): value is Plugin {
    return typeof value === 'object' && value !== null && typeof Reflect.get(value, 'name') === 'string';
}

function pluginExpected(value: unknown): string {
    if (typeof value !== 'function') return 'a Vite plugin object with a name';
    if (value.name === '') return 'a Vite plugin, which you get by calling this function';
    return `a Vite plugin, like ${paint.bold(`${value.name}()`)} with the parentheses`;
}

function invalidField(field: string, expected: string): SeedcordTypeError {
    return new SeedcordTypeError(SeedcordErrorCode.CliConfigInvalidField, [field, expected]);
}

export async function readVitePlugins(config: unknown, configFile: string): Promise<VitePluginsRead> {
    const options = isPlainObject(config) ? config.vitePlugins : undefined;
    if (options === undefined) return { plugins: [], problems: [] };
    if (!Array.isArray(options))
        return { plugins: [], problems: [invalidField('vitePlugins', 'an array of Vite plugins')] };

    const read: VitePluginsRead = { plugins: [], problems: [] };
    for (const entry of await flattenAt(options, 'vitePlugins')) {
        if ('rejected' in entry) {
            const reason = asError(entry.rejected).message;
            read.problems.push(
                new SeedcordError(SeedcordErrorCode.CoreVitePluginThrew, [entry.field, {}, configFile, reason], {
                    cause: entry.rejected
                })
            );
        } else if (isVitePlugin(entry.value)) read.plugins.push(entry.value);
        else read.problems.push(invalidField(entry.field, pluginExpected(entry.value)));
    }
    return read;
}

export function wrapVitePlugins(plugins: readonly Plugin[], configFile: string): Plugin[] {
    return plugins.map((plugin) => withThrownByOnErrors(plugin, configFile));
}

export function rethrowVitePluginError(error: unknown): never {
    throw vitePluginThrew(error) ?? error;
}
