import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { isPlainObject } from '@seedcord/utils/internal';

import { runProjectTsc } from '#core/modules/runProjectTsc';

import type { Project } from '#core/project/Project';

// --showConfig follows extends
async function hasWorkerdCondition(tsconfig: string, configDir: string): Promise<boolean> {
    const { exitCode, stdout, stderr } = await runProjectTsc(configDir, ['-p', tsconfig, '--showConfig']);
    if (exitCode !== 0) {
        throw new SeedcordError(SeedcordErrorCode.CliTsconfigUnreadable, [tsconfig, (stdout + stderr).trim()]);
    }

    const shown: unknown = JSON.parse(stdout);
    const options = isPlainObject(shown) ? shown.compilerOptions : undefined;
    const conditions = isPlainObject(options) ? options.customConditions : undefined;
    return Array.isArray(conditions) && conditions.includes('workerd');
}

export async function assertTargetMatchesTsconfig(project: Project): Promise<void> {
    const { target } = project.config;
    const tsconfig = project.tsconfig();

    if (tsconfig === undefined) {
        if (target.kind === 'edge') throw new SeedcordError(SeedcordErrorCode.CliBuildNoTsconfig, [project.configDir]);
        return;
    }

    const hasWorkerd = await hasWorkerdCondition(tsconfig, project.configDir);
    if (target.kind === 'edge' && !hasWorkerd) {
        throw new SeedcordError(SeedcordErrorCode.CliEdgeWithoutWorkerdCondition, [target.wranglerConfig, tsconfig]);
    }
    if (target.kind === 'server' && hasWorkerd) {
        throw new SeedcordError(SeedcordErrorCode.CliWorkerdConditionWithoutWrangler, [tsconfig, project.configDir]);
    }
}
