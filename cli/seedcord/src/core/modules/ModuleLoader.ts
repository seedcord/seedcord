export interface ModuleLoader {
    importModule<TModule = unknown>(entryPath: string): Promise<TModule>;
}
