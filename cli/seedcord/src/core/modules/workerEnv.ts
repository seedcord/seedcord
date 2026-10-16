import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { isPlainObject } from '@seedcord/utils/internal';
import { loadEnv } from 'vite';

import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import type { ModuleLoader } from './ModuleLoader';

export type WorkerVars = Record<string, string | undefined>;

// cf's defineConfig takes a function that gets the vite mode
function isConfigFunction(value: unknown): value is (context: { mode: string }) => unknown {
    return typeof value === 'function';
}

function textBindings(config: unknown): Record<string, string> {
    const env = isPlainObject(config) && isPlainObject(config.worker) ? config.worker.env : undefined;
    if (!isPlainObject(env)) return {};
    return Object.fromEntries(
        Object.entries(env).flatMap(([name, binding]) =>
            isPlainObject(binding) && binding.type === 'text' && typeof binding.value === 'string'
                ? [[name, binding.value]]
                : []
        )
    );
}

// the env the cloudflare plugin gives the worker, rebuilt for the copy of the bot that node loads
export class WorkerEnv {
    private vars?: WorkerVars;

    constructor(
        private readonly envDir: string,
        private readonly mode: string
    ) {}

    public async readConfig(modules: ModuleLoader, cloudflareConfig: string): Promise<void> {
        const exported = resolveDefaultExport(await modules.importModule(cloudflareConfig));
        const config: unknown = isConfigFunction(exported) ? await exported({ mode: this.mode }) : exported;
        // a text binding beats an env file's value for the same name
        this.vars = { ...this.localVars(), ...textBindings(config) };
    }

    public values(): WorkerVars {
        if (this.vars === undefined) throw new SeedcordError(SeedcordErrorCode.CliWorkerEnvNotRead);
        return this.vars;
    }

    // the plugin takes the first .dev.vars file it finds over the .env files and the shell
    private localVars(): WorkerVars {
        const devVars = [`.dev.vars.${this.mode}`, '.dev.vars']
            .map((name) => join(this.envDir, name))
            .find((path) => existsSync(path));
        if (devVars !== undefined) return parseEnv(readFileSync(devVars, 'utf8'));
        // an empty prefix makes loadEnv return process.env too
        return loadEnv(this.mode, this.envDir, '');
    }
}
