import type { BuildTarget } from '#core/config/detectTarget';

export interface ModuleLoader {
    importModule<TModule = unknown>(entryPath: string): Promise<TModule>;
}

// a config loader runs seedcord.config.ts under node conditions, even for an edge bot
export type LoaderUse = 'config' | 'bot';

export type OpenModules = (
    projectDir: string,
    target: BuildTarget,
    mode: string,
    use?: LoaderUse
) => Promise<ModuleLoader & AsyncDisposable>;
