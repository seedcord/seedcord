import type { BuildTarget } from '#core/config/detectTarget';
import type { PluginOption } from 'vite';

export interface ModuleLoader {
    importModule<TModule = unknown>(entryPath: string): Promise<TModule>;
}

export interface BotCode {
    readonly vitePlugins: PluginOption[];
}

// a config loader runs seedcord.config.ts under node conditions, even for an edge bot
export type LoaderUse = 'config' | BotCode;

export type OpenModules = (
    projectDir: string,
    target: BuildTarget,
    mode: string,
    use: LoaderUse
) => Promise<ModuleLoader & AsyncDisposable>;
