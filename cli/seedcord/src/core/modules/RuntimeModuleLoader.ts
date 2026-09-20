import { existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { createJiti } from 'jiti';

import type { ModuleLoader } from './ModuleLoader';

const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);

export class RuntimeModuleLoader implements ModuleLoader {
    private readonly jiti = createJiti(import.meta.url, {
        cache: false,
        interopDefault: true,
        extensions: ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs']
    });

    public async importModule<TModule = unknown>(entryPath: string): Promise<TModule> {
        const normalized = resolve(entryPath);
        if (!existsSync(normalized)) {
            throw new SeedcordError(SeedcordErrorCode.CliEntryNotFound, [normalized]);
        }

        if (TS_EXTENSIONS.has(extname(normalized).toLowerCase())) {
            return this.importTypeScript<TModule>(normalized);
        }

        return this.importWithNode<TModule>(normalized);
    }

    private async importTypeScript<TModule = unknown>(entryPath: string): Promise<TModule> {
        try {
            return await this.jiti.import<TModule>(entryPath);
        } catch (error: unknown) {
            const reason = Error.isError(error) ? error.message : 'Unknown jiti error';
            throw new SeedcordError(SeedcordErrorCode.CliTsImportFailed, [entryPath, reason]);
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
                const nativeReason = Error.isError(nativeError) ? nativeError.message : 'Unknown ESM import error';
                const fallbackReason = Error.isError(fallbackError) ? fallbackError.message : 'Unknown jiti error';
                throw new SeedcordError(SeedcordErrorCode.CliImportFailed, [entryPath, nativeReason, fallbackReason]);
            }
        }
    }
}
