import * as path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { asError } from '#src/misc/asError';

interface VitePlugins {
    configFile: string;
    names: readonly string[];
}

interface PluginFailure {
    plugin: string;
    id: string;
}

// edge dev's worker entry writes this slot too
export const VITE_PLUGINS_KEY = 'seedcord:utils:vite-plugins';

// a global because dev loads the bot with its own copy of this module
const VITE_PLUGINS_SLOT = Symbol.for(VITE_PLUGINS_KEY);

export function setVitePlugins(plugins: VitePlugins | undefined): void {
    if (plugins === undefined) Reflect.deleteProperty(globalThis, VITE_PLUGINS_SLOT);
    else Reflect.set(globalThis, VITE_PLUGINS_SLOT, plugins);
}

function vitePlugins(): VitePlugins | undefined {
    return Reflect.get(globalThis, VITE_PLUGINS_SLOT) as VitePlugins | undefined;
}

// vite sets these on an error from a plugin's load or transform hook
function pluginFailure(error: unknown): PluginFailure | undefined {
    if (!Error.isError(error)) return undefined;
    const plugin: unknown = Reflect.get(error, 'plugin');
    const id: unknown = Reflect.get(error, 'id');
    return typeof plugin === 'string' && typeof id === 'string' ? { plugin, id } : undefined;
}

export function vitePluginThrew(error: unknown): SeedcordError | undefined {
    const plugins = vitePlugins();
    const failure = pluginFailure(error);
    if (!plugins || !failure || !plugins.names.includes(failure.plugin)) return undefined;
    const loading = path.relative(process.cwd(), failure.id.split('?')[0] ?? failure.id);
    return new SeedcordError(
        SeedcordErrorCode.CoreVitePluginThrew,
        [failure.plugin, { file: loading }, plugins.configFile, asError(error).message],
        { cause: error }
    );
}

export function importFailed(file: string, error: unknown): SeedcordError {
    return (
        vitePluginThrew(error) ??
        new SeedcordError(SeedcordErrorCode.CoreImportFailed, [file, asError(error).message], { cause: error })
    );
}
