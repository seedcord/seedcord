import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { ChangelogRenderer } from '#src/release/ChangelogRenderer';

import type { RenderedChangeset, UpdatedDependency } from '#src/release/ChangelogRenderer';

const run = promisify(execFile);

interface ChangelogOptions {
    repo?: string;
}

async function subjectOf(sha: string): Promise<string | undefined> {
    try {
        const { stdout } = await run('git', ['log', '-1', '--format=%s', sha]);

        return stdout.trim();
    } catch {
        return undefined;
    }
}

function rendererFor(options: ChangelogOptions | null): ChangelogRenderer {
    const repo = options?.repo;
    if (repo === undefined) {
        throw new Error('changelog config needs a repo, as in ["./path/changelog.ts", { "repo": "owner/name" }]');
    }

    return new ChangelogRenderer({ repo, subjectOf });
}

export default {
    getReleaseLine: (changeset: RenderedChangeset, _type: string, options: ChangelogOptions | null): Promise<string> =>
        rendererFor(options).releaseLine(changeset),

    getDependencyReleaseLine: (
        _changesets: readonly RenderedChangeset[],
        updated: readonly UpdatedDependency[],
        options: ChangelogOptions | null
    ): Promise<string> => Promise.resolve(rendererFor(options).dependencyLine(updated))
};
