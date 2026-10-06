import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TypeChecker } from '#commands/build/builder/TypeChecker';
import { silentLogger } from '#tests/silentLogger';

import type { ResolvedSeedcordDevConfig } from '#core/config/schema';

let projectDir: string;

beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'seedcord-typecheck-'));
});

afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
});

// justified: the type checker reads only configFile and build
function configFor(tsconfig?: string): ResolvedSeedcordDevConfig {
    return {
        configFile: join(projectDir, 'seedcord.config.ts'),
        build:
            tsconfig === undefined
                ? { outDir: join(projectDir, 'dist') }
                : { outDir: join(projectDir, 'dist'), tsconfig }
    } as ResolvedSeedcordDevConfig;
}

describe('TypeChecker', () => {
    it('reports a build.tsconfig that points at a missing file', async () => {
        await expect(
            new TypeChecker(silentLogger).check(configFor(join(projectDir, 'nope.json')))
        ).rejects.toMatchObject({ code: SeedcordErrorCode.CliBuildTsconfigNotFound });
    });

    it('reports a project with no tsconfig.json and no build.tsconfig', async () => {
        await expect(new TypeChecker(silentLogger).check(configFor())).rejects.toMatchObject({
            code: SeedcordErrorCode.CliBuildNoTsconfig
        });
    });
});
