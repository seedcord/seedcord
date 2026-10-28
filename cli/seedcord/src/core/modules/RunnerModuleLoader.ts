import { existsSync } from 'node:fs';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { importFailed, isPlainObject } from '@seedcord/utils/internal';

import { ENV_BOOTSTRAP_ID } from './envBootstrap';

import type { EvaluatedModule, ModuleLoader } from './ModuleLoader';
import type { bindViteEnv } from '@seedcord/core/internal/env';
import type { ModuleRunner } from 'vite/module-runner';

// this is way longer than any real import. the edge test bot's cold import takes about 135ms
const IMPORT_DEADLINE_MS = 30_000;

export class RunnerModuleLoader implements ModuleLoader, AsyncDisposable {
    private binding?: Disposable;

    constructor(
        private readonly runner: ModuleRunner,
        private readonly deadlineMs = IMPORT_DEADLINE_MS
    ) {}

    public async importModule<TModule = unknown>(path: string): Promise<TModule> {
        if (path.includes('#')) throw new SeedcordError(SeedcordErrorCode.CliPathHasHash, [path]);
        if (!existsSync(path))
            throw new SeedcordError(SeedcordErrorCode.CoreImportFailed, [path, 'The file does not exist.']);
        return this.load<TModule>(path, path);
    }

    public importPackage(name: string): Promise<Record<string, unknown>> {
        return this.load<Record<string, unknown>>(name, name);
    }

    public evaluated(): readonly EvaluatedModule[] {
        return this.runner.evaluatedModules.idToModuleMap
            .values()
            .flatMap(({ id, file, exports, imports }) =>
                file && isPlainObject(exports) ? [{ id, file, exports, imports }] : []
            )
            .toArray();
    }

    public async bindEnv(): Promise<void> {
        const { binding } = await this.load<{ binding: ReturnType<typeof bindViteEnv> }>(ENV_BOOTSTRAP_ID, 'envapt');
        this.binding = binding;
    }

    public async [Symbol.asyncDispose](): Promise<void> {
        try {
            await this.runner.close();
        } finally {
            this.binding?.[Symbol.dispose]();
        }
    }

    private async load<TModule>(id: string, shownAs: string): Promise<TModule> {
        let timer: NodeJS.Timeout | undefined;
        const stalled = new Promise<undefined>((resolve) => {
            timer = setTimeout(resolve, this.deadlineMs, undefined);
        });
        try {
            const loaded = await Promise.race([
                this.runner.import<TModule>(id).then((module) => ({ module })),
                stalled
            ]);
            if (loaded) return loaded.module;
        } catch (error: unknown) {
            throw importFailed(shownAs, error);
        } finally {
            clearTimeout(timer);
        }

        const stalledReason = `It was still loading after ${this.deadlineMs / 1000}s. Look for a top-level await in it, or in a file it imports, that never settles.`;
        throw new SeedcordError(SeedcordErrorCode.CoreImportFailed, [shownAs, stalledReason]);
    }
}
