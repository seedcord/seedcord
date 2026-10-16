import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseEnv } from 'node:util';

import { loadAndParseConfig } from '@cloudflare/config';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { loadEnv } from 'vite';

import { isPackageMissing } from './cloudflarePlugin';

import type { ParsedInputWorkerConfig } from '@cloudflare/config';

type LocalVars = Record<string, string | undefined>;

const CONFIG_LOADER = "Cloudflare's config loader";

// @cloudflare/config loads cloudflare.config.ts through node's module.registerHooks and throws on bun.
// delete this once bun ships registerHooks and cloudflare stops throwing on it
function assertNotBun(): void {
    if ('Bun' in globalThis) throw new SeedcordError(SeedcordErrorCode.CliEdgeOnBun);
}

async function loadWorker(cloudflareConfig: string, mode: string): Promise<ParsedInputWorkerConfig> {
    assertNotBun();
    // the plugin passes its own isPreviewBuild() here. it doesn't export that function
    const { result } = await loadAndParseConfig(cloudflareConfig, { isPreview: false, mode }).catch(
        (error: unknown) => {
            if (!isPackageMissing(error, 'cf')) throw error;
            const why = `${paint.path('cloudflare.config.ts')} imports ${paint.bold('cf/config')}.`;
            throw new SeedcordError(SeedcordErrorCode.CliDependencyMissing, [['cf'], dirname(cloudflareConfig), why], {
                cause: error
            });
        }
    );

    if (!result.success) {
        const problems = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
        throw new SeedcordError(SeedcordErrorCode.CliConfigFileUnreadable, [
            CONFIG_LOADER,
            cloudflareConfig,
            problems.join('\n')
        ]);
    }
    const { worker } = result.data;
    if (worker === undefined) {
        throw new SeedcordError(SeedcordErrorCode.CliConfigFileUnreadable, [
            CONFIG_LOADER,
            cloudflareConfig,
            'It must define a Worker using the worker property.'
        ]);
    }
    if (worker.entrypoint !== undefined) {
        const why = `seedcord sets it to the default export of ${paint.bold('instance')} in your seedcord config.`;
        throw new SeedcordTypeError(SeedcordErrorCode.CliConfigFieldUnused, ['entrypoint', cloudflareConfig, why]);
    }
    return worker;
}

// the env the cloudflare plugin gives the worker, rebuilt for the copy of the bot that node loads
export class WorkerEnv {
    public readonly files: readonly string[];
    private readonly envDir: string;

    private constructor(
        private readonly worker: ParsedInputWorkerConfig,
        cloudflareConfig: string,
        private readonly mode: string
    ) {
        this.envDir = dirname(cloudflareConfig);
        this.files = ['.dev.vars', `.dev.vars.${mode}`, '.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`];
    }

    public static async load(cloudflareConfig: string, mode: string): Promise<WorkerEnv> {
        return new WorkerEnv(await loadWorker(cloudflareConfig, mode), cloudflareConfig, mode);
    }

    // the plugin's resolveLocalBindings builds the worker's env by the same rules
    public values(): Record<string, string> {
        const local = this.localVars();
        const values: Record<string, string> = {};
        for (const [name, binding] of Object.entries(this.worker.env ?? {})) {
            const secret = local[name];
            if (binding.type === 'text') values[name] = binding.value;
            else if (binding.type === 'secret' && secret !== undefined) values[name] = secret;
        }
        return values;
    }

    // the plugin takes the first .dev.vars file it finds over the .env files and the shell
    private localVars(): LocalVars {
        const devVars = [`.dev.vars.${this.mode}`, '.dev.vars']
            .map((name) => join(this.envDir, name))
            .find((path) => existsSync(path));
        if (devVars !== undefined) return parseEnv(readFileSync(devVars, 'utf8'));
        // an empty prefix makes loadEnv return process.env too
        return loadEnv(this.mode, this.envDir, '');
    }
}
