import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

import { BOT_ENVIRONMENT, LOOK_FOR_BUILD_PLUGIN } from '#core/modules/botEnvironment';
import { importCloudflare, isPackageMissing } from '#core/modules/cloudflarePlugin';

import { bundleFailed } from './output';
import { workerEntryConfig } from './workerEntry';

import type { EdgeTarget } from '#core/config/detectTarget';
import type { CloudflarePlugin, ImportCloudflare } from '#core/modules/cloudflarePlugin';
import type { ResolvedOutputWorkerConfig } from '@cloudflare/build-output-utils';
import type { PluginConfig } from '@cloudflare/vite-plugin';
import type { Plugin } from 'vite';

export interface BuiltWorker {
    config: ResolvedOutputWorkerConfig;
    bundleDir: string;
}

const CLOUDFLARE_PLUGIN = '@cloudflare/vite-plugin';

async function loadPlugin(viteRoot: string, importPlugin: ImportCloudflare): Promise<CloudflarePlugin> {
    try {
        const { cloudflare } = await importPlugin();
        return cloudflare;
    } catch (error: unknown) {
        if (isPackageMissing(error, CLOUDFLARE_PLUGIN)) {
            const why = `${paint.bold('seedcord dev')} and ${paint.bold('seedcord build')} run an edge bot through it.`;
            throw new SeedcordError(SeedcordErrorCode.CliDependencyMissing, [[CLOUDFLARE_PLUGIN], viteRoot, why], {
                cause: error
            });
        }
        throw new SeedcordError(SeedcordErrorCode.CoreImportFailed, [CLOUDFLARE_PLUGIN, asError(error).message], {
            cause: error
        });
    }
}

export class CloudflareWorker {
    private constructor(
        private readonly cloudflare: CloudflarePlugin,
        private readonly viteRoot: string
    ) {}

    public static async load(
        { viteRoot }: EdgeTarget,
        importPlugin: ImportCloudflare = importCloudflare
    ): Promise<CloudflareWorker> {
        return new CloudflareWorker(await loadPlugin(viteRoot, importPlugin), viteRoot);
    }

    public plugins(options: Pick<PluginConfig, 'persistState'> = {}): Plugin[] {
        return this.cloudflare({
            config: workerEntryConfig,
            viteEnvironment: { name: BOT_ENVIRONMENT },
            inspectorPort: false,
            ...options
        });
    }

    public async built(): Promise<BuiltWorker> {
        // a gateway or node http bot never loads this or the @cloudflare/config it imports
        const { readBuildOutput } = await import('@cloudflare/build-output-utils');
        const { workers } = await readBuildOutput(this.viteRoot);
        const { config, bundleDir } = workers.default;
        return bundleDir === undefined
            ? bundleFailed(
                  `${paint.bold(CLOUDFLARE_PLUGIN)} wrote the worker to ${paint.path('.cloudflare/output')} without its ${paint.path('bundle')} folder. ${LOOK_FOR_BUILD_PLUGIN}`
              )
            : { config, bundleDir };
    }
}
