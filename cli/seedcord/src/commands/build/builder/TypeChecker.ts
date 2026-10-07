import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { resolveProjectTsc } from '#core/modules/resolveProjectTsc';

import type { ResolvedSeedcordDevConfig } from '#core/config/schema';

interface ProcessResult {
    exitCode: number;
    output: string;
}

const MAX_OUTPUT_CHARS = 24_000;

export class TypeChecker {
    // returns the tsconfig it checked with
    public async check(config: ResolvedSeedcordDevConfig): Promise<string> {
        const tsconfigPath = this.resolveTsconfig(config);
        const projectDir = dirname(config.configFile);

        const tsc = resolveProjectTsc(projectDir);
        if (!tsc) throw new SeedcordError(SeedcordErrorCode.CliTypescriptMissing, [projectDir]);

        const result = await this.run(
            process.execPath,
            [tsc, '-p', tsconfigPath, '--noEmit', '--pretty', 'false'],
            projectDir
        );
        if (result.exitCode === 0) return tsconfigPath;

        throw new SeedcordError(SeedcordErrorCode.CliBuildFailed, [this.truncate(result.output)]);
    }

    private resolveTsconfig(config: ResolvedSeedcordDevConfig): string {
        if (config.build.tsconfig) {
            if (!existsSync(config.build.tsconfig)) {
                throw new SeedcordError(SeedcordErrorCode.CliBuildTsconfigNotFound, [config.build.tsconfig]);
            }
            return config.build.tsconfig;
        }

        const configDir = dirname(config.configFile);
        const candidate = resolve(configDir, 'tsconfig.json');
        if (existsSync(candidate)) return candidate;

        throw new SeedcordError(SeedcordErrorCode.CliBuildNoTsconfig, [configDir]);
    }

    private run(cmd: string, args: string[], cwd: string): Promise<ProcessResult> {
        return new Promise((resolvePromise, rejectPromise) => {
            const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });

            let output = '';
            child.stdout.on('data', (chunk) => {
                output += String(chunk);
            });
            child.stderr.on('data', (chunk) => {
                output += String(chunk);
            });

            child.on('error', (error) => {
                rejectPromise(new SeedcordError(SeedcordErrorCode.CliBuildFailed, [error.message], { cause: error }));
            });
            child.on('close', (code) => {
                resolvePromise({ exitCode: code ?? 1, output });
            });
        });
    }

    private truncate(text: string): string {
        const trimmed = text.trim();
        if (trimmed.length <= MAX_OUTPUT_CHARS) return trimmed;
        return `${trimmed.slice(0, MAX_OUTPUT_CHARS)}\n...output truncated...`;
    }
}
