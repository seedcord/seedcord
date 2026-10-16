import type { BuildTarget } from '#core/config/detectTarget';

export interface ModuleLoader {
    importModule<TModule = unknown>(entryPath: string): Promise<TModule>;
}

export type OpenModules = (
    projectDir: string,
    target: BuildTarget,
    mode: string
) => Promise<ModuleLoader & AsyncDisposable>;
