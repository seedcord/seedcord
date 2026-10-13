import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { DevRuntimeContext, DevRuntimeLoadResult } from './DevRuntime';

// imports the instance file in node, reporting each step to the TUI
export async function loadEntry(
    modules: ModuleLoader,
    { config, onEvent }: DevRuntimeContext
): Promise<DevRuntimeLoadResult> {
    const { instance } = config;
    onEvent?.({ type: 'module-loading', path: instance });
    try {
        const module = await modules.importModule(instance);
        onEvent?.({ type: 'module-loaded', path: instance });
        return { module };
    } catch (error: unknown) {
        onEvent?.({ type: 'module-error', path: instance, error });
        throw error;
    }
}
