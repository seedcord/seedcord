import type { BuildTarget } from '#core/config/detectTarget';
import type { ResolvedSeedcordConfig } from '#core/config/schema';

export interface EvaluatedModule {
    readonly id: string;
    readonly file: string;
    readonly exports: Record<string, unknown>;
    readonly imports: ReadonlySet<string>;
}

export interface ModuleLoader {
    importModule<TModule = unknown>(entryPath: string): Promise<TModule>;
    // the package's main entry, resolved the way the bot's own `import 'name'` resolves
    importPackage(name: string): Promise<Record<string, unknown>>;
    evaluated(): readonly EvaluatedModule[];
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
