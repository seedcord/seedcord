import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { runProjectTsc } from '#core/modules/runProjectTsc';

import type { Project } from '#core/project/Project';

const MAX_OUTPUT_CHARS = 24_000;

export class TypeChecker {
    public async check(project: Project): Promise<{ tsconfig: string }> {
        const tsconfig = project.tsconfig();
        if (!tsconfig) throw new SeedcordError(SeedcordErrorCode.CliBuildNoTsconfig, [project.configDir]);

        const result = await runProjectTsc(project.configDir, ['-p', tsconfig, '--noEmit', '--pretty', 'false']);
        if (result.exitCode === 0) return { tsconfig };

        throw new SeedcordError(SeedcordErrorCode.CliBuildFailed, [this.truncate(result.stdout + result.stderr)]);
    }

    private truncate(text: string): string {
        const trimmed = text.trim();
        if (trimmed.length <= MAX_OUTPUT_CHARS) return trimmed;
        return `${trimmed.slice(0, MAX_OUTPUT_CHARS)}\n...output truncated...`;
    }
}
