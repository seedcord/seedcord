import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { GitHubApi } from '#src/lib/GitHubApi';
import { PreviewPlanner } from '#src/preview/PreviewPlanner';

const SHA = 'abc123';

// the first key found in the request url answers it. a function answers each request fresh
function plannerFor(answers: Record<string, object | (() => object)>): PreviewPlanner {
    const fetcher: typeof fetch = (input) => {
        const { url } = new Request(input);
        const match = Object.keys(answers).find((part) => url.includes(part));
        if (match === undefined) throw new Error(`Unexpected GitHub request: ${url}`);
        const answer = answers[match];
        return Promise.resolve(Response.json(typeof answer === 'function' ? answer() : answer));
    };
    return new PreviewPlanner(new GitHubApi('owner/repo', 'token', fetcher), 442);
}

const pushTouching = (filename: string): PreviewPlanner =>
    plannerFor({
        'pulls/442/files': [{ filename, status: 'modified' }],
        'pulls/442': { head: { sha: SHA } }
    });

type Run = NonNullable<Awaited<ReturnType<GitHubApi['lastPullRequestRun']>>>;

const BUILT: Run = { id: 77, status: 'completed', conclusion: 'success' };

// each runs lookup answers with the next run in the list, then repeats the last
const commentBy = (role: string, runs: Run[], state = 'open'): PreviewPlanner =>
    plannerFor({
        permission: { role_name: role },
        'pulls/442': { state, head: { sha: SHA } },
        'workflows/site-preview.yml/runs': () => ({ workflow_runs: runs.length > 1 ? runs.splice(0, 1) : runs }),
        'runs/77/artifacts': { artifacts: [{ name: 'home' }, { name: 'something-else' }] }
    });

afterEach(() => {
    vi.useRealTimers();
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
        const plan = await commentBy('triage', [BUILT]).forComment('someone');

        expect(plan).toEqual({ sha: SHA, apps: ['home'], artifactRun: 77, workerRef: 'next' });
    });

    it('waits for a build that is still running', async () => {
        vi.useFakeTimers();
        let settled = false;
        const plan = commentBy('triage', [{ ...BUILT, status: 'in_progress', conclusion: null }, BUILT])
            .forComment('someone')
            .finally(() => (settled = true));

        await vi.advanceTimersByTimeAsync(0);
        expect(settled).toBe(false);

        await vi.runAllTimersAsync();
        await expect(plan).resolves.toMatchObject({ artifactRun: 77 });
    });

    it('refuses a comment from a role below triage', async () => {
        await expect(commentBy('read', [BUILT]).forComment('someone')).rejects.toThrow(
            'someone has the read role. /preview needs triage or higher.'
        );
    });

    it('refuses a comment on a closed pull request, since nothing would delete its workers', async () => {
        await expect(commentBy('admin', [BUILT], 'closed').forComment('someone')).rejects.toThrow(
            '#442 is closed. /preview only works on an open pull request.'
        );
    });

    it('refuses a comment when that commit is missing a build', async () => {
        await expect(commentBy('admin', []).forComment('someone')).rejects.toThrow(
            `${SHA} doesn't have a site-preview.yml run`
        );
    });

    it("refuses a comment when that commit's build ended without success", async () => {
        await expect(
            commentBy('admin', [{ ...BUILT, conclusion: 'action_required' }]).forComment('someone')
        ).rejects.toThrow(`${SHA}'s site-preview.yml run ended as action_required`);
    });
});
