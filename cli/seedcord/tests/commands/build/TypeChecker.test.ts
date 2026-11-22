import { mkdtempDisposable } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { TypeChecker } from '#commands/build/builder/TypeChecker';
import { Project } from '#core/project/Project';
import { ProjectFiles } from '#core/project/ProjectFiles';
import { realPath } from '#core/project/realPath';
import { emptyModuleGraph } from '#tests/emptyModuleGraph';
import { resolvedConfigOf } from '#tests/resolvedConfigOf';

let projectDir: string;

beforeEach(async () => {
    const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-typecheck-'));
    projectDir = tmp.path;
    return () => tmp.remove();
});

function projectFor(tsconfig?: string): Project {
    const config = resolvedConfigOf(projectDir, {
        root: realPath(projectDir),
        build: tsconfig === undefined ? {} : { tsconfig: realPath(tsconfig) }
    });
    const loader = {
        importModule: () => Promise.reject(new Error('the type checker loads no modules')),
        ...emptyModuleGraph,
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

    it('reports a project without tsconfig.json or build.tsconfig', async () => {
        await expect(new TypeChecker().check(projectFor())).rejects.toMatchObject({
            code: SeedcordErrorCode.CliTsconfigNotFound
        });
    });
});
