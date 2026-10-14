import type { ModuleLoader } from './ModuleLoader';

// workerd loads a worker only when each named export is a function or a handler object
export async function functionExportsOf(modules: ModuleLoader, instance: string): Promise<string[]> {
    const module = await modules.importModule<Record<string, unknown>>(instance);
    return Object.entries(module).reduce<string[]>((names, [name, value]) => {
        if (name !== 'default' && typeof value === 'function') names.push(name);
        return names;
    }, []);
}
