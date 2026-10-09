export interface ModuleLoader {
    importModule<TModule = unknown>(entryPath: string): Promise<TModule>;
}

export type OpenModules = (projectDir: string) => Promise<ModuleLoader & AsyncDisposable>;
