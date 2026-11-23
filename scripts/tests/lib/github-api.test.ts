import { describe, expect, it } from 'vite-plus/test';

import { GitHubApi } from '#src/lib/GitHubApi';

const ok = (payload: unknown): Response => Response.json(payload);

function recorder(...responses: Response[]): { calls: Request[]; fetcher: typeof fetch } {
    const calls: Request[] = [];
    const fetcher: typeof fetch = (url, init) => {
        const request = new Request(url, init);
        calls.push(request);
        const response = responses.shift();
        if (!response) throw new Error(`Unexpected GitHub request: ${request.method} ${request.url}`);
        return Promise.resolve(response);
    };
    return { calls, fetcher };
}

describe('GitHubApi requests', () => {
    it.each([
        { token: 'secret', authorization: 'Bearer secret' },
        { token: undefined, authorization: null }
    ])('sends authorization=$authorization', async ({ token, authorization }) => {
        const { calls, fetcher } = recorder(ok([]));

        await new GitHubApi('owner/repo', token, fetcher).pullRequestFiles(1);

        expect(calls[0]?.headers.get('authorization')).toBe(authorization);
    });

    it('reports the operation and HTTP failure', async () => {
        const { fetcher } = recorder(new Response(null, { status: 403, statusText: 'Forbidden' }));

        await expect(new GitHubApi('owner/repo', 'token', fetcher).pullRequestFiles(311)).rejects.toThrow(
            'listing files on pull request #311 failed: 403 Forbidden'
        );
    });

    it('collects every page until a short page ends the listing', async () => {
        const first = Array.from({ length: 100 }, () => ({ filename: 'file.ts', status: 'added' }));
        const last = { filename: 'last.ts', status: 'added' };
        const { calls, fetcher } = recorder(ok(first), ok([last]));

        const files = await new GitHubApi('owner/repo', 'token', fetcher).pullRequestFiles(311);

        expect(files).toEqual([...first, last]);
        expect(calls[0]?.url).toContain('/repos/owner/repo/pulls/311/files?per_page=100&page=1');
        expect(calls[1]?.url).toContain('page=2');
    });
});

describe('GitHubApi file contents', () => {
    it('decodes the contents and preserves reserved characters in the path and ref', async () => {
        const { calls, fetcher } = recorder(ok({ content: Buffer.from('hello').toString('base64') }));
        const api = new GitHubApi('owner/repo', 'token', fetcher);

        await expect(api.fileContents('docs/weird#name?.md', 'feature/docs & guide')).resolves.toBe('hello');

        expect(calls[0]?.url).toBe(
            'https://api.github.com/repos/owner/repo/contents/docs/weird%23name%3F.md?ref=feature%2Fdocs%20%26%20guide'
        );
    });
});

describe('GitHubApi contributors', () => {
    it.each([
        { user: { login: 'alice', type: 'User' }, expected: 'alice' },
        { user: { login: 'automation[bot]', type: 'Bot' }, expected: undefined }
    ])('reads the PR author for $user.type accounts', async ({ user, expected }) => {
        const { calls, fetcher } = recorder(ok({ user }));

        await expect(new GitHubApi('owner/repo', 'token', fetcher).pullRequestAuthor(311)).resolves.toBe(expected);
        expect(calls[0]?.url).toBe('https://api.github.com/repos/owner/repo/pulls/311');
    });

    it('keeps human commit authors in order and excludes bots and unmatched accounts', async () => {
        const { calls, fetcher } = recorder(
            ok([
                { author: { login: 'alice', type: 'User' } },
                { author: { login: 'automation[bot]', type: 'Bot' } },
                { author: null },
                { author: { login: 'bob', type: 'User' } },
                { author: { login: 'alice', type: 'User' } }
            ])
        );

        await expect(new GitHubApi('owner/repo', 'token', fetcher).pullRequestCommitAuthors(311)).resolves.toEqual([
            'alice',
            'bob',
            'alice'
        ]);
        expect(calls[0]?.url).toContain('/pulls/311/commits?');
    });
});

describe('GitHubApi review requests', () => {
    it('excludes the author, already requested reviewers, and past reviewers regardless of casing', async () => {
        const { calls, fetcher } = recorder(
            ok({
                state: 'open',
                draft: false,
                user: { login: 'Author' },
                requested_reviewers: [{ login: 'Requested' }]
            }),
            ok([{ user: null }, { user: { login: 'Reviewed' } }]),
            ok({})
        );
        const api = new GitHubApi('owner/repo', 'token', fetcher);

        await api.requestMissingReviews(311, ['author', 'requested', 'reviewed', 'New']);

        expect(calls.at(-1)).toMatchObject({
            url: 'https://api.github.com/repos/owner/repo/pulls/311/requested_reviewers',
            method: 'POST'
        });
        expect(await calls.at(-1)?.json()).toEqual({ reviewers: ['New'] });
    });

    it.each([
        { state: 'open', draft: true },
        { state: 'closed', draft: false }
    ])('skips a $state pull request with draft=$draft', async (pull) => {
        const { calls, fetcher } = recorder(ok(pull));

        await new GitHubApi('owner/repo', 'token', fetcher).requestMissingReviews(311, ['reviewer']);

        expect(calls).toHaveLength(1);
    });

    it('does not send a request when all candidates have already reviewed', async () => {
        const { calls, fetcher } = recorder(
            ok({ state: 'open', draft: false, user: null, requested_reviewers: [] }),
            ok([{ user: { login: 'reviewer' } }])
        );

        await new GitHubApi('owner/repo', 'token', fetcher).requestMissingReviews(311, ['reviewer']);

        expect(calls.map(({ method }) => method)).toEqual(['GET', 'GET']);
    });
});

describe('GitHubApi labels', () => {
    it('returns label names from every page', async () => {
        const { calls, fetcher } = recorder(
            ok(Array.from({ length: 100 }, (_, index) => ({ name: `label-${String(index)}` }))),
            ok([{ name: 'last-label' }])
        );

        const labels = await new GitHubApi('owner/repo', 'token', fetcher).labels(311);

        expect(labels).toHaveLength(101);
        expect(labels.at(-1)).toBe('last-label');
        expect(calls[0]?.url).toContain('/issues/311/labels?');
    });

    it('posts label names as JSON', async () => {
        const { calls, fetcher } = recorder(ok([]));

        await new GitHubApi('owner/repo', 'token', fetcher).addLabels(311, ['bug']);

        expect(calls[0]).toMatchObject({
            url: 'https://api.github.com/repos/owner/repo/issues/311/labels',
            method: 'POST'
        });
        expect(calls[0]?.headers.get('content-type')).toBe('application/json');
        expect(await calls[0]?.json()).toEqual({ labels: ['bug'] });
    });

    it('encodes the label name when deleting it', async () => {
        const { calls, fetcher } = recorder(ok([]));

        await new GitHubApi('owner/repo', 'token', fetcher).removeLabel(311, 'needs review?');

        expect(calls[0]).toMatchObject({
            url: 'https://api.github.com/repos/owner/repo/issues/311/labels/needs%20review%3F',
            method: 'DELETE'
        });
    });
});
