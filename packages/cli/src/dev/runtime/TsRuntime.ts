import { RuntimeModuleLoader } from '../../modules/RuntimeModuleLoader';

import type { DevRuntime, DevRuntimeContext, DevRuntimeEventHandler, DevRuntimeLoadResult } from './DevRuntime';

/**
 * Baseline DevRuntime implementation that uses the existing TypeScript execution path.
 * This runtime uses tsx/jiti to load and execute TypeScript modules directly,
 * matching the current behavior of seedcord dev.
 */
export class TsRuntime implements DevRuntime {
    private context: DevRuntimeContext | null = null;
    private readonly moduleLoader: RuntimeModuleLoader;
    private eventHandler: DevRuntimeEventHandler | null = null;

    constructor() {
        this.moduleLoader = new RuntimeModuleLoader();
    }

    public start(context: DevRuntimeContext): Promise<void> {
        this.context = context;
        this.eventHandler = context.onEvent ?? null;
        this.emit({ type: 'ready' });
        return Promise.resolve();
    }

    public async loadEntry(): Promise<DevRuntimeLoadResult> {
        if (!this.context) {
            throw new Error('TsRuntime.start() must be called before loadEntry()');
        }

        const { instance: entryPath } = this.context.config;
        const startTime = performance.now();

        this.emit({ type: 'module-loading', path: entryPath });

        try {
            const module = await this.moduleLoader.importModule(entryPath);
            const loadTime = performance.now() - startTime;

            this.emit({ type: 'module-loaded', path: entryPath });

            return {
                module,
                metadata: {
                    loadTime
                }
            };
        } catch (error: unknown) {
            this.emit({ type: 'module-error', path: entryPath, error });
            throw error;
        }
    }

    public dispose(): Promise<void> {
        this.context = null;
        this.eventHandler = null;
        return Promise.resolve();
    }

    private emit(event: Parameters<DevRuntimeEventHandler>[0]): void {
        this.eventHandler?.(event);
    }
}
