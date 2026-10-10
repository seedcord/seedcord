import { mkdtempDisposable } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { beforeEach, describe, expect, it } from 'vitest';

import { TypeChecker } from '#commands/build/builder/TypeChecker';
import { Project } from '#core/project/Project';

import type { ResolvedSeedcordConfig } from '#core/config/schema';

let projectDir: string;

beforeEach(async () => {
    const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-typecheck-'));
    projectDir = tmp.path;
    return () => tmp.remove();
});

// justified: the type checker reads only configFile and build
function projectFor(tsconfig?: string): Project {
    const config = {
        root: projectDir,
        configFile: join(projectDir, 'seedcord.config.ts'),
        build:
            tsconfig === undefined
                ? { outDir: join(projectDir, 'dist') }
                : { outDir: join(projectDir, 'dist'), tsconfig }
    } as ResolvedSeedcordConfig;
    const loader = {
        importModule: () => Promise.reject(new Error('the type checker loads no modules')),
        [Symbol.asyncDispose]: () => Promise.resolve()
    };
    return new Project(config, loader);
}

describe('TypeChecker', () => {
    it('reports a build.tsconfig that points at a missing file', async () => {
        await expect(new TypeChecker().check(projectFor(join(projectDir, 'nope.json')))).rejects.toMatchObject({
            code: SeedcordErrorCode.CliBuildTsconfigNotFound
        });
    });

    it('reports a project with no tsconfig.json and no build.tsconfig', async () => {
        await expect(new TypeChecker().check(projectFor())).rejects.toMatchObject({
            code: SeedcordErrorCode.CliBuildNoTsconfig
        });
    });
});
