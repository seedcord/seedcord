import { dirname } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { projectTsconfig } from '#core/config/projectTsconfig';
import { runProjectTsc } from '#core/modules/runProjectTsc';

import type { ResolvedSeedcordDevConfig } from '#core/config/schema';

const MAX_OUTPUT_CHARS = 24_000;

export class TypeChecker {
    public async check(config: ResolvedSeedcordDevConfig): Promise<{ tsconfig: string }> {
        const projectDir = dirname(config.configFile);
        const tsconfig = projectTsconfig(config);
        if (!tsconfig) throw new SeedcordError(SeedcordErrorCode.CliBuildNoTsconfig, [projectDir]);

        const result = await runProjectTsc(projectDir, ['-p', tsconfig, '--noEmit', '--pretty', 'false']);
        if (result.exitCode === 0) return { tsconfig };

        throw new SeedcordError(SeedcordErrorCode.CliBuildFailed, [this.truncate(result.stdout + result.stderr)]);
    }

    private truncate(text: string): string {
        const trimmed = text.trim();
        if (trimmed.length <= MAX_OUTPUT_CHARS) return trimmed;
        return `${trimmed.slice(0, MAX_OUTPUT_CHARS)}\n...output truncated...`;
    }
}
