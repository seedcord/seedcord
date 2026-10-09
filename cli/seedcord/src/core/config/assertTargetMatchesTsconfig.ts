import { dirname } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { isPlainObject } from '@seedcord/utils/internal';

import { runProjectTsc } from '#core/modules/runProjectTsc';

import { projectTsconfig } from './projectTsconfig';

import type { ResolvedSeedcordDevConfig } from './schema';

// --showConfig follows extends
async function hasWorkerdCondition(tsconfig: string, projectDir: string): Promise<boolean> {
    const { exitCode, stdout, stderr } = await runProjectTsc(projectDir, ['-p', tsconfig, '--showConfig']);
    if (exitCode !== 0) {
        throw new SeedcordError(SeedcordErrorCode.CliTsconfigUnreadable, [tsconfig, (stdout + stderr).trim()]);
    }

    const shown: unknown = JSON.parse(stdout);
    const options = isPlainObject(shown) ? shown.compilerOptions : undefined;
    const conditions = isPlainObject(options) ? options.customConditions : undefined;
    return Array.isArray(conditions) && conditions.includes('workerd');
}

export async function assertTargetMatchesTsconfig(config: ResolvedSeedcordDevConfig): Promise<void> {
    const projectDir = dirname(config.configFile);
    const { target } = config;
    const tsconfig = projectTsconfig(config);

    if (tsconfig === undefined) {
        if (target.kind === 'edge') throw new SeedcordError(SeedcordErrorCode.CliBuildNoTsconfig, [projectDir]);
        return;
    }

    const hasWorkerd = await hasWorkerdCondition(tsconfig, projectDir);
    if (target.kind === 'edge' && !hasWorkerd) {
        throw new SeedcordError(SeedcordErrorCode.CliEdgeWithoutWorkerdCondition, [target.wranglerConfig, tsconfig]);
    }
    if (target.kind === 'node' && hasWorkerd) {
        throw new SeedcordError(SeedcordErrorCode.CliWorkerdConditionWithoutWrangler, [tsconfig, projectDir]);
    }
}
