import { dirname } from 'node:path';

import { readBuildOutput } from '@cloudflare/build-output-utils';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

import { importCloudflare, WORKER_ENVIRONMENT } from '#core/modules/cloudflarePlugin';

import { bundleFailed } from './output';
import { workerEntryConfig } from './workerEntry';

import type { CloudflarePlugin, ImportCloudflare } from '#core/modules/cloudflarePlugin';
import type { ResolvedOutputWorkerConfig } from '@cloudflare/build-output-utils';
import type { Plugin } from 'vite';

type PluginOptions = NonNullable<Parameters<CloudflarePlugin>[0]>;

export interface BuiltWorker {
    config: ResolvedOutputWorkerConfig;
    bundleDir: string;
}

const CLOUDFLARE_PLUGIN = '@cloudflare/vite-plugin';

// the importer's path at the end of node's message can hold the name too
function isPackageMissing(error: unknown, name: string): boolean {
    const notFound = Error.isError(error) && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND';
    return notFound && error.message.startsWith(`Cannot find package '${name}'`);
}

// @cloudflare/config loads cloudflare.config.ts through node's module.registerHooks and throws on bun.
// delete this once bun ships registerHooks and cloudflare stops throwing on it
export function assertNotBun(): void {
    if ('Bun' in globalThis) throw new SeedcordError(SeedcordErrorCode.CliEdgeOnBun);
}

async function loadPlugin(viteRoot: string, importPlugin: ImportCloudflare): Promise<CloudflarePlugin> {
    try {
        const { cloudflare } = await importPlugin();
        return cloudflare;
    } catch (error: unknown) {
        if (isPackageMissing(error, CLOUDFLARE_PLUGIN)) {
            const why = `${paint.bold('seedcord dev')} and ${paint.bold('seedcord build')} run an edge bot through them.`;
            throw new SeedcordError(
                SeedcordErrorCode.CliDependencyMissing,
                [[CLOUDFLARE_PLUGIN, 'cf'], viteRoot, why],
                { cause: error }
            );
        }
        throw new SeedcordError(SeedcordErrorCode.CoreImportFailed, [CLOUDFLARE_PLUGIN, asError(error).message], {
            cause: error
        });
    }
}

export class CloudflareWorker {
    private readonly viteRoot: string;

    private constructor(
        private readonly cloudflare: CloudflarePlugin,
        private readonly cloudflareConfig: string
    ) {
        this.viteRoot = dirname(cloudflareConfig);
    }

    public static async load(
        cloudflareConfig: string,
        importPlugin: ImportCloudflare = importCloudflare
    ): Promise<CloudflareWorker> {
        assertNotBun();
        return new CloudflareWorker(await loadPlugin(dirname(cloudflareConfig), importPlugin), cloudflareConfig);
    }

    public plugins(options: Pick<PluginOptions, 'persistState'> = {}): Plugin[] {
        return this.cloudflare({
            config: workerEntryConfig(this.cloudflareConfig),
            viteEnvironment: { name: WORKER_ENVIRONMENT },
            inspectorPort: false,
            ...options
        });
    }

    // node resolves the cf/config import in cloudflare.config.ts from the bot's own node_modules
    public explain(error: unknown): unknown {
        if (!isPackageMissing(error, 'cf')) return error;
        const why = `${paint.bold('cloudflare.config.ts')} imports ${paint.bold('cf/config')}.`;
        return new SeedcordError(SeedcordErrorCode.CliDependencyMissing, [['cf'], this.viteRoot, why], {
            cause: error
        });
    }

    public async built(): Promise<BuiltWorker> {
        const { workers } = await readBuildOutput(this.viteRoot);
        const { config, bundleDir } = workers.default;
        return bundleDir === undefined
            ? bundleFailed(`the ${WORKER_ENVIRONMENT} environment wrote no bundle folder`)
            : { config, bundleDir };
    }
}
