import type { ResolvedSeedcordConfig } from './schema';

export class LoadedConfig implements AsyncDisposable {
    constructor(
        public readonly config: ResolvedSeedcordConfig,
        // a local plugin file's lazy import() goes through this loader
        private readonly configLoader?: AsyncDisposable
    ) {}

    public async [Symbol.asyncDispose](): Promise<void> {
        await this.configLoader?.[Symbol.asyncDispose]();
    }
}
