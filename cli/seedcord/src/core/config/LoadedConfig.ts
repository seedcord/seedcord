import type { ProjectFiles } from '#core/project/ProjectFiles';
import type { ResolvedSeedcordConfig } from './schema';

export class LoadedConfig implements AsyncDisposable {
    constructor(
        public readonly config: ResolvedSeedcordConfig,
        public readonly files: ProjectFiles,
        // a local plugin file's lazy import() goes through this loader
        private readonly configLoader?: AsyncDisposable
    ) {}

    public get hasVitePlugins(): boolean {
        return this.config.vitePlugins.isDeclared;
    }

    public async [Symbol.asyncDispose](): Promise<void> {
        await this.configLoader?.[Symbol.asyncDispose]();
    }
}
