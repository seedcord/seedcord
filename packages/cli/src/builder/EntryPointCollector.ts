import { basename, dirname, extname, relative } from 'node:path';

import { SeedcordError, SeedcordErrorCode } from '@seedcord/services';
import ts from 'typescript';

import type { ResolvedSeedcordDevConfig } from '../config/schema';

export interface EntryPointCollection {
    entryMap: Record<string, string>;
    primaryKey: string;
}

export class EntryPointCollector {
    public collect(config: ResolvedSeedcordDevConfig, tsconfigPath: string): EntryPointCollection {
        const parsed = this.parseTsconfig(tsconfigPath);
        const entries = new Map<string, string>();

        for (const filePath of parsed.fileNames) {
            if (!this.shouldEmitFile(config, filePath)) continue;
            entries.set(this.createEntryKey(config, filePath), filePath);
        }

        const entryKey = this.createEntryKey(config, config.entry);
        if (!entries.size || !entries.has(entryKey)) entries.set(entryKey, config.entry);

        return { entryMap: Object.fromEntries(entries), primaryKey: entryKey } satisfies EntryPointCollection;
    }

    private parseTsconfig(tsconfigPath: string): ts.ParsedCommandLine {
        const configFile = ts.readConfigFile(tsconfigPath, (filePath) => ts.sys.readFile(filePath));
        if (configFile.error) {
            const reason = this.formatDiagnostics([configFile.error]);
            throw new SeedcordError(SeedcordErrorCode.CliBuildTsconfigInvalid, [tsconfigPath, reason]);
        }

        const parsed = ts.parseJsonConfigFileContent(
            configFile.config,
            ts.sys,
            dirname(tsconfigPath),
            undefined,
            tsconfigPath
        );
        if (parsed.errors.length) {
            const reason = this.formatDiagnostics(parsed.errors);
            throw new SeedcordError(SeedcordErrorCode.CliBuildTsconfigInvalid, [tsconfigPath, reason]);
        }

        return parsed;
    }

    private shouldEmitFile(config: ResolvedSeedcordDevConfig, filePath: string): boolean {
        if (!this.isWithinRoot(config.root, filePath)) return false;
        if (/\.d\.[cm]?ts$/i.test(filePath)) return false;
        return /\.[cm]?tsx?$/i.test(filePath);
    }

    private isWithinRoot(root: string, target: string): boolean {
        const relativePath = relative(root, target);
        return relativePath === '' || (!relativePath.startsWith('..') && !relativePath.startsWith('..\\'));
    }

    private createEntryKey(config: ResolvedSeedcordDevConfig, filePath: string): string {
        const relativePath = relative(config.root, filePath);
        const fallback = this.createEntryFallback(filePath);
        if (relativePath.startsWith('..')) return fallback;

        const sanitized = relativePath
            .replace(/\\/g, '/')
            .replace(/^\.\//, '')
            .replace(/\.[^.]+$/, '')
            .replace(/[^a-zA-Z0-9\-/_]/g, '-');

        return sanitized || fallback;
    }

    private createEntryFallback(filePath: string): string {
        const base = basename(filePath, extname(filePath)) || 'seedcord-entry';
        return base.replace(/[^a-zA-Z0-9-_]/g, '-');
    }

    private formatDiagnostics(diagnostics: readonly ts.Diagnostic[]): string {
        return diagnostics
            .map((diagnostic) => {
                const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                if (diagnostic.file && typeof diagnostic.start === 'number') {
                    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                    return `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`;
                }

                return message;
            })
            .join('\n');
    }
}
