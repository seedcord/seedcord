/**
 * Applies one semver label (🩹 patch / ✨ minor / 💥 major) to a pull request from its changeset bumps.
 * The Semver labeler workflow runs this with `tsx`; the token, repo, PR number, and head sha come from env.
 */
import { fileURLToPath } from 'node:url';

import { parseChangesetFile } from '@changesets/parse';
import { Converters, Envapter } from 'envapt';

import { GitHubApi } from '#src/lib/GitHubApi';

Envapter.strict = true;

const RANK = { patch: 1, minor: 2, major: 3 } as const;
type Bump = keyof typeof RANK;
const LABEL: Record<Bump, string> = { patch: '🩹 patch', minor: '✨ minor', major: '💥 major' };

/** The highest semver bump across a set of changeset file bodies, or null when none carry one. */
export function maxBump(changesets: string[]): Bump | null {
    let top: Bump | null = null;

    for (const body of changesets) {
        for (const { type } of parseChangesetFile(body).releases) {
            if (type === 'none') continue;
            if (top === null || RANK[type] > RANK[top]) top = type;
        }
    }

    return top;
}

/** The changeset files this PR adds or edits. */
export function changesetPathsFromFiles(files: { filename: string; status: string }[]): string[] {
    return files
        .filter((file) => {
            const name = file.filename.split('/').pop() ?? '';
            const touched = file.status === 'added' || file.status === 'modified';
            return file.filename.startsWith('.changeset/') && name.endsWith('.md') && name !== 'README.md' && touched;
        })
        .map((file) => file.filename);
}

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    void main();
}
