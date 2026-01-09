import { existsSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { SeedcordErrorCode } from '@seedcord/services';
import { SeedcordError } from '@seedcord/services/internal';
import { createJiti } from 'jiti';
import { tsImport } from 'tsx/esm/api';

import type { ModuleLoader } from './ModuleLoader';

type TsconfigOption = string | false;

interface RuntimeModuleLoaderOptions {
    tsconfig?: TsconfigOption;
    forceTsx?: boolean;
}

const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);

export class RuntimeModuleLoader implements ModuleLoader {
    private readonly jiti = createJiti(import.meta.url, {
        cache: false,
        interopDefault: true,
        extensions: ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs']
    });

    constructor(private readonly options: RuntimeModuleLoaderOptions = {}) {}

    public async importModule<TModule = unknown>(entryPath: string): Promise<TModule> {
        const normalized = resolve(entryPath);
        if (!existsSync(normalized)) {
            throw new SeedcordError(SeedcordErrorCode.CliEntryNotFound, [normalized]);
        }

        if (this.shouldUseTsx(normalized)) {
            return this.importWithTsx<TModule>(normalized);
        }

        return this.importWithNode<TModule>(normalized);
    }

    private shouldUseTsx(filePath: string): boolean {
        if (this.options.forceTsx) return true;
        return TS_EXTENSIONS.has(extname(filePath).toLowerCase());
    }

    private async importWithTsx<TModule = unknown>(entryPath: string): Promise<TModule> {
        const specifier = pathToFileURL(entryPath).href;
        const tsconfig = this.resolveTsconfig(entryPath);

        try {
            return (await tsImport(specifier, { parentURL: import.meta.url, tsconfig })) as TModule;
        } catch (error: unknown) {
            const reason = error instanceof Error ? error.message : 'Unknown tsx error';
            throw new SeedcordError(SeedcordErrorCode.CliTsxImportFailed, [entryPath, reason]);
        }
    }

    private async importWithNode<TModule = unknown>(entryPath: string): Promise<TModule> {
        const specifier = pathToFileURL(entryPath).href;

        try {
            return (await import(specifier)) as TModule;
        } catch (nativeError: unknown) {
            try {
                return await this.jiti.import(entryPath);
            } catch (fallbackError: unknown) {
                const nativeReason = nativeError instanceof Error ? nativeError.message : 'Unknown ESM import error';
                const fallbackReason = fallbackError instanceof Error ? fallbackError.message : 'Unknown jiti error';
                throw new SeedcordError(SeedcordErrorCode.CliImportFailed, [entryPath, nativeReason, fallbackReason]);
            }
        }
    }

    private resolveTsconfig(entryPath: string): TsconfigOption {
        if (typeof this.options.tsconfig !== 'undefined') {
            return this.options.tsconfig;
        }

        return this.findNearestTsconfig(dirname(entryPath)) ?? false;
    }

    private findNearestTsconfig(startDir: string): string | undefined {
        const candidate = resolve(startDir, 'tsconfig.json');
        if (existsSync(candidate)) return candidate;

        const parent = dirname(startDir);
        if (parent === startDir) return undefined;

        return this.findNearestTsconfig(parent);
    }
}
