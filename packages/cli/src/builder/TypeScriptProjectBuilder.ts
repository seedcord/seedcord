import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createRequire as createNodeRequire } from 'node:module';
import { dirname, extname, relative, resolve } from 'node:path';

import { isSeedcordError, SeedcordError, SeedcordErrorCode } from '@seedcord/services';

import type { ResolvedSeedcordDevConfig } from '../config/schema';
import type { ILogger } from '@seedcord/types';

export interface BuildResult {
    emittedEntry: string;
}

interface ProcessResult {
    exitCode: number;
    output: string;
}

export class TypeScriptProjectBuilder {
    constructor(private readonly logger: ILogger) {}

    public async build(config: ResolvedSeedcordDevConfig): Promise<BuildResult> {
        const tsconfigPath = this.resolveTsconfig(config);
        const projectDir = dirname(config.configFile);

        await mkdir(config.build.outDir, { recursive: true });

        this.logger.info(`Building Seedcord project via tsc using ${tsconfigPath}`);

        try {
            await this.runTsc(projectDir, tsconfigPath);
            await this.fixRelativeSpecifiers(config.build.outDir);
        } catch (error: unknown) {
            if (isSeedcordError(error)) throw error;

            const reason = error instanceof Error ? error.message : 'Unknown build error';
            throw new SeedcordError(SeedcordErrorCode.CliBuildFailed, [reason]);
        }

        const emittedEntry = this.resolveEmittedEntry(config);
        if (!existsSync(emittedEntry)) {
            throw new SeedcordError(SeedcordErrorCode.CliBuildFailed, [
                `Expected output file ${emittedEntry} missing after build`
            ]);
        }

        this.logger.info(`Emitted entry: ${emittedEntry}`);
        return { emittedEntry } satisfies BuildResult;
    }

    private async runTsc(projectDir: string, tsconfigPath: string): Promise<void> {
        const tscPath = this.resolveProjectTsc(projectDir);

        const result = await this.runNodeScript(projectDir, tscPath, ['-p', tsconfigPath, '--pretty', 'false']);
        if (result.exitCode === 0) return;

        throw new SeedcordError(SeedcordErrorCode.CliBuildFailed, [
            `TypeScript compilation failed:\n${this.truncateOutput(result.output)}`
        ]);
    }

    private async fixRelativeSpecifiers(outDir: string): Promise<void> {
        const fixPath = this.resolveFixEsmImportPath();

        const result = await this.runNodeScript(process.cwd(), fixPath, [outDir]);
        if (result.exitCode === 0) return;

        throw new SeedcordError(SeedcordErrorCode.CliBuildFailed, [
            `Failed to fix relative import specifiers:\n${this.truncateOutput(result.output)}`
        ]);
    }

    private resolveProjectTsc(projectDir: string): string {
        const projectRequire = this.createProjectRequire(projectDir);

        try {
            return projectRequire.resolve('typescript/bin/tsc');
        } catch (error: unknown) {
            const reason = error instanceof Error ? error.message : 'Unknown resolution error';
            throw new SeedcordError(SeedcordErrorCode.CliBuildFailed, [
                `Unable to resolve typescript. Ensure it is installed in this project.\n${reason}`
            ]);
        }
    }

    private resolveFixEsmImportPath(): string {
        const selfRequire = createNodeRequire(import.meta.url);

        try {
            return selfRequire.resolve('fix-esm-import-path/fix-esm-import-path.js');
        } catch {
            return selfRequire.resolve('fix-esm-import-path');
        }
    }

    private createProjectRequire(projectDir: string): NodeRequire {
        const candidate = resolve(projectDir, 'package.json');
        if (existsSync(candidate)) return createNodeRequire(candidate);

        return createNodeRequire(import.meta.url);
    }

    private async runNodeScript(cwd: string, scriptPath: string, args: string[]): Promise<ProcessResult> {
        return await this.runProcess(process.execPath, [scriptPath, ...args], cwd);
    }

    private runProcess(cmd: string, args: string[], cwd: string): Promise<ProcessResult> {
        return new Promise((resolvePromise, rejectPromise) => {
            const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });

            let output = '';

            child.stdout.on('data', (chunk) => {
                output += String(chunk);
            });

            child.stderr.on('data', (chunk) => {
                output += String(chunk);
            });

            child.on('error', rejectPromise);

            child.on('close', (code) => {
                resolvePromise({ exitCode: code ?? 1, output });
            });
        });
    }

    private truncateOutput(text: string, maxChars = 24_000): string {
        const trimmed = text.trim();
        if (trimmed.length <= maxChars) return trimmed;
        return `${trimmed.slice(0, maxChars)}\n...output truncated...`;
    }

    private resolveTsconfig(config: ResolvedSeedcordDevConfig): string {
        if (config.build.tsconfig) {
            if (!existsSync(config.build.tsconfig)) {
                throw new SeedcordError(SeedcordErrorCode.CliBuildTsconfigNotFound, [config.build.tsconfig]);
            }

            return config.build.tsconfig;
        }

        const configDir = dirname(config.configFile);
        const candidates = ['tsconfig.build.json', 'tsconfig.json']
            .map((file) => resolve(configDir, file))
            .filter((candidate) => existsSync(candidate));

        const [firstCandidate] = candidates;
        if (firstCandidate) return firstCandidate;

        throw new SeedcordError(SeedcordErrorCode.CliBuildTsconfigNotFound, [configDir]);
    }

    private resolveEmittedEntry(config: ResolvedSeedcordDevConfig): string {
        const relFromRoot = relative(config.root, config.entry);
        const relNoExt = relFromRoot.slice(0, relFromRoot.length - extname(relFromRoot).length);
        return resolve(config.build.outDir, `${relNoExt}.js`);
    }
}
