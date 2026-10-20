import { mkdtempDisposable } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { beforeEach, describe, expect, it } from 'vitest';

import { TypeChecker } from '#commands/build/builder/TypeChecker';
import { Project } from '#core/project/Project';
import { ProjectFiles } from '#core/project/ProjectFiles';
import { realPath } from '#core/project/realPath';

import type { ResolvedSeedcordConfig } from '#core/config/schema';

let projectDir: string;

beforeEach(async () => {
    const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-typecheck-'));
    projectDir = tmp.path;
    return () => tmp.remove();
});

function projectFor(tsconfig?: string): Project {
    const read: Pick<ResolvedSeedcordConfig, 'root' | 'configFile' | 'files' | 'target' | 'build'> = {
        root: realPath(projectDir),
        configFile: realPath(join(projectDir, 'seedcord.config.ts')),
        files: [],
        target: {
            kind: 'server',
            start: realPath(join(projectDir, 'index.ts')),
            outDir: realPath(join(projectDir, 'dist'))
        },
        build: tsconfig === undefined ? {} : { tsconfig: realPath(tsconfig) }
    };
    // justified: the type checker and Project read only the fields above
    const config = read as ResolvedSeedcordConfig;
    const loader = {
        importModule: () => Promise.reject(new Error('the type checker loads no modules')),
        [Symbol.asyncDispose]: () => Promise.resolve()
    };
    return new Project(config, new ProjectFiles(config), loader);
}

describe('TypeChecker', () => {
    it('reports a build.tsconfig that points at a missing file', async () => {
        await expect(new TypeChecker().check(projectFor(join(projectDir, 'nope.json')))).rejects.toMatchObject({
            code: SeedcordErrorCode.CliTsconfigNotFound
        });
    });

    it('reports a project with no tsconfig.json and no build.tsconfig', async () => {
        await expect(new TypeChecker().check(projectFor())).rejects.toMatchObject({
            code: SeedcordErrorCode.CliTsconfigNotFound
        });
    });
});
