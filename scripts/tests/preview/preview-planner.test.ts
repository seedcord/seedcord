import { describe, expect, it } from 'vite-plus/test';

import { GitHubApi } from '#src/lib/GitHubApi';
import { PreviewPlanner } from '#src/preview/PreviewPlanner';

const SHA = 'abc123';

// the first key found in the request url answers it
function plannerFor(answers: Record<string, unknown>): PreviewPlanner {
    const fetcher: typeof fetch = (input) => {
        const { url } = new Request(input);
        const match = Object.keys(answers).find((part) => url.includes(part));
        if (match === undefined) throw new Error(`Unexpected GitHub request: ${url}`);
        return Promise.resolve(Response.json(answers[match]));
    };
    return new PreviewPlanner(new GitHubApi('owner/repo', 'token', fetcher), 442);
}

const pushTouching = (filename: string): PreviewPlanner =>
    plannerFor({
        'pulls/442/files': [{ filename, status: 'modified' }],
        'pulls/442': { head: { sha: SHA } }
    });

const commentBy = (role: string, runs: { id: number }[], state = 'open'): PreviewPlanner =>
    plannerFor({
        permission: { role_name: role },
        'pulls/442': { state, head: { sha: SHA } },
        'workflows/site-preview.yml/runs': { workflow_runs: runs },
        'runs/77/artifacts': { artifacts: [{ name: 'home' }, { name: 'something-else' }] }
    });

describe('PreviewPlanner', () => {
    it.each([
        { path: 'apps/home/content/blog/post/index.mdx', apps: ['home'] },
        { path: 'apps/guide/content/docs/index.mdx', apps: ['guide'] },
        { path: 'tooling/ui/src/Button.tsx', apps: ['home', 'guide'] },
        { path: 'packages/core/src/index.ts', apps: [] }
    ])('previews $apps for a push touching $path', async ({ path, apps }) => {
        await expect(pushTouching(path).forPush(9)).resolves.toEqual({
            sha: SHA,
            apps,
            artifactRun: 9,
            workerRef: SHA
        });
    });

    it('deploys a comment from the last build, with worker code from next', async () => {
        const plan = await commentBy('triage', [{ id: 77 }]).forComment('someone');

        expect(plan).toEqual({ sha: SHA, apps: ['home'], artifactRun: 77, workerRef: 'next' });
    });

    it('refuses a comment from a role below triage', async () => {
        await expect(commentBy('read', [{ id: 77 }]).forComment('someone')).rejects.toThrow(
            'someone has the read role. /preview needs triage or higher.'
        );
    });

    it('refuses a comment on a closed pull request, since nothing would delete its workers', async () => {
        await expect(commentBy('admin', [{ id: 77 }], 'closed').forComment('someone')).rejects.toThrow(
            '#442 is closed. /preview only works on an open pull request.'
        );
    });

    it('refuses a comment when that commit has no successful build', async () => {
        await expect(commentBy('admin', []).forComment('someone')).rejects.toThrow(
            `${SHA} doesn't have a successful site-preview.yml run`
        );
    });
});
