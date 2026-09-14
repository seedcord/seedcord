import { describe, expect, it } from 'vitest';

import { GitHubApi } from '#src/lib/GitHubApi';

interface Call {
    url: string;
    method: string;
    body: string | undefined;
    headers: Record<string, string>;
}

interface Reply {
    ok: boolean;
    status: number;
    statusText: string;
    json: () => Promise<unknown>;
}

type Fetcher = (
    url: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<Reply>;

const ok = (payload: unknown): Reply => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: (): Promise<unknown> => Promise.resolve(payload)
});

const failure = (status: number, statusText: string): Reply => ({
    ok: false,
    status,
    statusText,
    json: (): Promise<unknown> => Promise.resolve({})
});

function recorder(...responses: Reply[]): { calls: Call[]; fetcher: Fetcher } {
    const calls: Call[] = [];
    let index = 0;

    const fetcher: Fetcher = (url, init) => {
        calls.push({
            url,
            method: init?.method ?? 'GET',
            body: init?.body,
            headers: init?.headers ?? {}
        });
        const response = responses[index] ?? ok([]);
        index += 1;
        return Promise.resolve(response);
    };

    return { calls, fetcher };
}

const file = (name: string): { filename: string; status: string } => ({ filename: name, status: 'added' });

describe('GitHubApi pull request files', () => {
    it('reads every page until a short one ends the listing', async () => {
        const firstPage = Array.from({ length: 100 }, (_, index) => file(`.changeset/${String(index)}.md`));
        const { calls, fetcher } = recorder(ok(firstPage), ok([file('.changeset/last.md')]));
        const api = new GitHubApi('seedcord/seedcord', 'token', fetcher);

        const files = await api.pullRequestFiles(311);

        expect(files).toHaveLength(101);
        expect(calls).toHaveLength(2);
        expect(calls[0]?.url).toContain('/repos/seedcord/seedcord/pulls/311/files?per_page=100&page=1');
        expect(calls[1]?.url).toContain('page=2');
    });

    it('sends the token and the api version on every call', async () => {
        const { calls, fetcher } = recorder(ok([]));
        await new GitHubApi('seedcord/seedcord', 'secret', fetcher).pullRequestFiles(1);

        expect(calls[0]?.headers.authorization).toBe('Bearer secret');
        expect(calls[0]?.headers['x-github-api-version']).toBe('2022-11-28');
    });

    it('sends no authorization header without a token', async () => {
        const { calls, fetcher } = recorder(ok([]));
        await new GitHubApi('seedcord/seedcord', undefined, fetcher).pullRequestFiles(1);

        expect(calls[0]?.headers.authorization).toBeUndefined();
    });

    it('throws naming the pull request when the listing fails', async () => {
        const fetcher: Fetcher = () => Promise.resolve(failure(403, 'Forbidden'));
        const api = new GitHubApi('seedcord/seedcord', 'token', fetcher);

        await expect(api.pullRequestFiles(311)).rejects.toThrow(/311/);
    });
});

describe('GitHubApi file contents', () => {
    it('decodes the base64 body', async () => {
        const content = Buffer.from('hello changeset', 'utf8').toString('base64');
        const { fetcher } = recorder(ok({ content }));
        const api = new GitHubApi('seedcord/seedcord', 'token', fetcher);

        await expect(api.fileContents('.changeset/a.md', 'abc123')).resolves.toBe('hello changeset');
    });

    it('keeps the slashes and percent-encodes the rest of the path', async () => {
        const { calls, fetcher } = recorder(ok({ content: '' }), ok({ content: '' }));
        const api = new GitHubApi('seedcord/seedcord', 'token', fetcher);

        await api.fileContents('.changeset/funny-lions-dance.md', 'main');
        await api.fileContents('.changeset/weird#name?.md', 'main');

        expect(calls[0]?.url).toContain('/contents/.changeset/funny-lions-dance.md?ref=main');
        expect(calls[1]?.url).toContain('/contents/.changeset/weird%23name%3F.md?ref=main');
    });

    it('throws naming the file when the read fails', async () => {
        const fetcher: Fetcher = () => Promise.resolve(failure(404, 'Not Found'));
        const api = new GitHubApi('seedcord/seedcord', 'token', fetcher);

        await expect(api.fileContents('.changeset/gone.md', 'main')).rejects.toThrow(/gone\.md/);
    });
});

describe('GitHubApi contributors', () => {
    it('reads the login that opened the pull request', async () => {
        const { calls, fetcher } = recorder(ok({ user: { login: 'alice', type: 'User' } }));
        const api = new GitHubApi('seedcord/seedcord', 'token', fetcher);

        await expect(api.pullRequestAuthor(311)).resolves.toBe('alice');
        expect(calls[0]?.url).toContain('/repos/seedcord/seedcord/pulls/311');
    });

    it('reads every commit author on the pull request', async () => {
        const { fetcher } = recorder(
            ok([
                { author: { login: 'alice', type: 'User' } },
                { author: { login: 'bob', type: 'User' } },
                { author: { login: 'alice', type: 'User' } }
            ])
        );
        const api = new GitHubApi('seedcord/seedcord', 'token', fetcher);

        await expect(api.pullRequestCommitAuthors(311)).resolves.toEqual(['alice', 'bob', 'alice']);
    });

    it('reads every page of commits on a pull request', async () => {
        const firstPage = Array.from({ length: 100 }, () => ({ author: { login: 'alice', type: 'User' } }));
        const { calls, fetcher } = recorder(ok(firstPage), ok([{ author: { login: 'bob', type: 'User' } }]));
        const api = new GitHubApi('seedcord/seedcord', 'token', fetcher);

        const authors = await api.pullRequestCommitAuthors(311);

        expect(authors).toContain('bob');
        expect(calls[1]?.url).toContain('/pulls/311/commits?per_page=100&page=2');
    });

    it('drops a bot account', async () => {
        const { fetcher } = recorder(
            ok([{ author: { login: 'dependabot[bot]', type: 'Bot' } }, { author: { login: 'cara', type: 'User' } }])
        );
        const api = new GitHubApi('seedcord/seedcord', 'token', fetcher);

        await expect(api.pullRequestCommitAuthors(311)).resolves.toEqual(['cara']);
    });

    it('skips a commit github matched to no account', async () => {
        const { fetcher } = recorder(ok([{ author: null }, { author: { login: 'cara', type: 'User' } }]));
        const api = new GitHubApi('seedcord/seedcord', 'token', fetcher);

        await expect(api.pullRequestCommitAuthors(311)).resolves.toEqual(['cara']);
    });

    it('gives no author when the pull request opener is a bot', async () => {
        const { fetcher } = recorder(ok({ user: { login: 'github-actions[bot]', type: 'Bot' } }));
        const api = new GitHubApi('seedcord/seedcord', 'token', fetcher);

        await expect(api.pullRequestAuthor(311)).resolves.toBeUndefined();
    });
});

describe('GitHubApi labels', () => {
    it('lists the label names on an issue', async () => {
        const { fetcher } = recorder(ok([{ name: '🩹 patch' }, { name: '📦 core' }]));
        const api = new GitHubApi('seedcord/seedcord', 'token', fetcher);

        await expect(api.labels(311)).resolves.toEqual(['🩹 patch', '📦 core']);
    });

    it('adds labels through a post', async () => {
        const { calls, fetcher } = recorder(ok([]));
        await new GitHubApi('seedcord/seedcord', 'token', fetcher).addLabels(311, ['✨ minor']);

        expect(calls[0]?.method).toBe('POST');
        expect(calls[0]?.url).toContain('/repos/seedcord/seedcord/issues/311/labels');
        expect(calls[0]?.body).toBe(JSON.stringify({ labels: ['✨ minor'] }));
        expect(calls[0]?.headers['content-type']).toBe('application/json');
    });

    it('encodes the label name when removing one', async () => {
        const { calls, fetcher } = recorder(ok([]));
        await new GitHubApi('seedcord/seedcord', 'token', fetcher).removeLabel(311, '✨ minor');

        expect(calls[0]?.method).toBe('DELETE');
        expect(calls[0]?.url).toContain(`/issues/311/labels/${encodeURIComponent('✨ minor')}`);
    });

    it('throws naming the issue when adding a label fails', async () => {
        const fetcher: Fetcher = () => Promise.resolve(failure(403, 'Forbidden'));

        await expect(new GitHubApi('seedcord/seedcord', 'token', fetcher).addLabels(311, ['✨ minor'])).rejects.toThrow(
            /311/
        );
    });

    it('throws naming the label when removing it fails', async () => {
        const fetcher: Fetcher = () => Promise.resolve(failure(403, 'Forbidden'));

        await expect(new GitHubApi('seedcord/seedcord', 'token', fetcher).removeLabel(311, '✨ minor')).rejects.toThrow(
            /✨ minor/
        );
    });
});
