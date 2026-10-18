import type { BuildTarget } from '#core/config/detectTarget';
import type { ResolvedSeedcordConfig } from '#core/config/schema';

export interface ModuleLoader {
    importModule<TModule = unknown>(entryPath: string): Promise<TModule>;
}

type BotCode = Pick<ResolvedSeedcordConfig, 'vitePlugins'>;

// a config loader runs seedcord.config.ts under node conditions, even for an edge bot
export type LoaderUse = 'config' | BotCode;

export type OpenModules = (
    projectDir: string,
    target: BuildTarget,
    mode: string,
    use: LoaderUse
) => Promise<ModuleLoader & AsyncDisposable>;
