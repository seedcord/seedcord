import { Converters, Envapter } from 'envapt';

import { GitHubApi } from '#src/lib/GitHubApi';
import { changesetPathsFromFiles, maxBump } from '#src/release/changeset-bumps';

import type { Bump } from '#src/release/changeset-bumps';

Envapter.strict = true;

const LABEL: Record<Bump, string> = { patch: '🩹 patch', minor: '✨ minor', major: '💥 major' };

interface Ctx {
    repo: string;
    pull: number;
    sha: string;
    token: string;
}

function readCtx(): Ctx {
    const env = Envapter.getRequiredAll({
        GITHUB_REPOSITORY: Converters.String,
        PR_NUMBER: Converters.Number,
        HEAD_SHA: Converters.String,
        GITHUB_TOKEN: Converters.String
    });

    const [owner, name] = env.GITHUB_REPOSITORY.split('/');
    if (!owner || !name) throw new Error('[semver-label] GITHUB_REPOSITORY must be "owner/repo"');

    return { repo: env.GITHUB_REPOSITORY, pull: env.PR_NUMBER, sha: env.HEAD_SHA, token: env.GITHUB_TOKEN };
}

async function main(): Promise<void> {
    const ctx = readCtx();
    const api = new GitHubApi(ctx.repo, ctx.token);

    const paths = changesetPathsFromFiles(await api.pullRequestFiles(ctx.pull));
    const bodies = await Promise.all(paths.map((path) => api.fileContents(path, ctx.sha)));

    const bump = maxBump(bodies);
    const want = bump ? LABEL[bump] : null;
    const current = new Set(await api.labels(ctx.pull));

    for (const stale of Object.values(LABEL)) {
        if (stale !== want && current.has(stale)) await api.removeLabel(ctx.pull, stale);
    }
    if (want && !current.has(want)) await api.addLabels(ctx.pull, [want]);
}

await main();
