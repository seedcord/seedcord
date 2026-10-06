import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { ResolvedSeedcordDevConfig } from '#core/config/schema';
import type { ILogger } from '@seedcord/types';

interface ProcessResult {
    exitCode: number;
    output: string;
}

const MAX_OUTPUT_CHARS = 24_000;

export class TypeChecker {
    constructor(private readonly logger: ILogger) {}

    public async check(config: ResolvedSeedcordDevConfig): Promise<void> {
        const tsconfigPath = this.resolveTsconfig(config);
        const projectDir = dirname(config.configFile);

        this.logger.info(`Type checking with ${tsconfigPath}`);

        const tsc = this.resolveProjectTsc(projectDir);
        const result = await this.run(
            process.execPath,
            [tsc, '-p', tsconfigPath, '--noEmit', '--pretty', 'false'],
            projectDir
        );
        if (result.exitCode === 0) return;

        throw new SeedcordError(SeedcordErrorCode.CliBuildFailed, [this.truncate(result.output)]);
    }

    private resolveProjectTsc(projectDir: string): string {
        const manifest = resolve(projectDir, 'package.json');
        const projectRequire = createRequire(existsSync(manifest) ? manifest : import.meta.url);

        try {
            return projectRequire.resolve('typescript/bin/tsc');
        } catch (error: unknown) {
            const reason = Error.isError(error) ? error.message : 'Unknown resolution error';
            throw new SeedcordError(SeedcordErrorCode.CliBuildFailed, [
                `Unable to resolve typescript. Ensure it is installed in this project.\n${reason}`
            ]);
        }
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

        throw new SeedcordError(SeedcordErrorCode.CliBuildTsconfigNotFound, [configDir]);
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

            child.on('error', rejectPromise);
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
