import type { ResolvedSeedcordConfig } from './schema';

export class LoadedConfig implements AsyncDisposable {
    constructor(
        public readonly config: ResolvedSeedcordConfig,
        // a local plugin file's lazy import() goes through this loader
        private readonly configLoader?: AsyncDisposable
    ) {}

    public get hasVitePlugins(): boolean {
        return this.config.vitePlugins.length > 0;
    }

    public async [Symbol.asyncDispose](): Promise<void> {
        await this.configLoader?.[Symbol.asyncDispose]();
    }
}
