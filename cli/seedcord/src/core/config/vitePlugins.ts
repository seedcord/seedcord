import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { asError, isPlainObject, recordThrownBy, vitePluginThrew } from '@seedcord/utils/internal';

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

function isFunction(value: unknown): value is HookFunction {
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
    if (isFunction(hook)) return rethrowing(hook, record);
    if (isPlainObject(hook) && isFunction(hook.handler)) return { ...hook, handler: rethrowing(hook.handler, record) };
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

type PluginsFactory = () => unknown;

interface VitePluginsRead {
    plugins: Plugin[];
    problems: (SeedcordError | SeedcordTypeError)[];
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

function threwWhileRead(field: string, thrown: unknown, configFile: string): SeedcordError {
    const reason = asError(thrown).message;
    return new SeedcordError(SeedcordErrorCode.CoreVitePluginThrew, [field, {}, configFile, reason], { cause: thrown });
}

async function readPlugins(factory: PluginsFactory, configFile: string): Promise<VitePluginsRead> {
    const read: VitePluginsRead = { plugins: [], problems: [] };
    let options: unknown;
    try {
        options = await factory();
    } catch (thrown) {
        read.problems.push(threwWhileRead('vitePlugins', thrown, configFile));
        return read;
    }
    if (!Array.isArray(options)) {
        read.problems.push(invalidField('vitePlugins', 'a function that returns an array of Vite plugins'));
        return read;
    }

    for (const entry of await flattenAt(options, 'vitePlugins')) {
        if ('rejected' in entry) read.problems.push(threwWhileRead(entry.field, entry.rejected, configFile));
        else if (isVitePlugin(entry.value)) read.plugins.push(entry.value);
        else read.problems.push(invalidField(entry.field, pluginExpected(entry.value)));
    }
    return read;
}

export class VitePlugins {
    public constructor(
        private readonly factory: PluginsFactory | undefined,
        private readonly configFile: string
    ) {}

    public get isDeclared(): boolean {
        return this.factory !== undefined;
    }

    // call this once per vite server or build. vite runs configureServer on a plugin object for every server it joins
    public async create(): Promise<Plugin[]> {
        if (this.factory === undefined) return [];
        const { plugins, problems } = await readPlugins(this.factory, this.configFile);
        throwSingleOrAggregate(problems, SeedcordErrorCode.CliProblems);
        return plugins.map((plugin) => withThrownByOnErrors(plugin, this.configFile));
    }
}

export function rethrowVitePluginError(error: unknown): never {
    throw vitePluginThrew(error) ?? error;
}
