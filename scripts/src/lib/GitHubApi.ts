const API = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const PAGE_SIZE = 100;

interface HttpResponse {
    ok: boolean;
    status: number;
    statusText: string;
    json: () => Promise<unknown>;
}

interface HttpRequest {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
}

type HttpFetch = (url: string, init?: HttpRequest) => Promise<HttpResponse>;

export interface PullRequestFile {
    filename: string;
    status: string;
}

interface Account {
    login: string;
    type: string;
}

const humanLogin = (account: Account | null | undefined): string | undefined =>
    account && account.type !== 'Bot' ? account.login : undefined;

export class GitHubApi {
    constructor(
        private readonly repo: string,
        private readonly token?: string,
        private readonly http: HttpFetch = fetch
    ) {}

    async pullRequestFiles(pull: number): Promise<PullRequestFile[]> {
        const files: PullRequestFile[] = [];

        for (let page = 1; ; page++) {
            const path = `/repos/${this.repo}/pulls/${pull}/files?per_page=${PAGE_SIZE}&page=${page}`;
            const response = await this.send('GET', path);
            if (!response.ok) {
                throw new Error(
                    `listing files on pull request #${pull} failed: ${response.status} ${response.statusText}`
                );
            }

            // justified: GitHub returns an array of file entries for this route
            const batch = (await response.json()) as PullRequestFile[];
            files.push(...batch);
            if (batch.length < PAGE_SIZE) return files;
        }
    }

    async fileContents(path: string, ref: string): Promise<string> {
        const response = await this.send('GET', `/repos/${this.repo}/contents/${encodePath(path)}?ref=${ref}`);
        if (!response.ok) {
            throw new Error(`reading ${path} failed: ${response.status} ${response.statusText}`);
        }

        // justified: GitHub returns the file body base64 encoded
        const { content } = (await response.json()) as { content: string };
        return Buffer.from(content, 'base64').toString('utf8');
    }

    async pullRequestAuthor(pull: number): Promise<string | undefined> {
        const response = await this.send('GET', `/repos/${this.repo}/pulls/${String(pull)}`);
        if (!response.ok) {
            throw new Error(`reading pull request #${String(pull)} failed: ${response.status} ${response.statusText}`);
        }

        // justified: GitHub returns the pull request object for this route
        const { user } = (await response.json()) as { user: Account | null };
        return humanLogin(user);
    }

    async pullRequestCommitAuthors(pull: number): Promise<string[]> {
        const response = await this.send(
            'GET',
            `/repos/${this.repo}/pulls/${String(pull)}/commits?per_page=${PAGE_SIZE}`
        );
        if (!response.ok) {
            throw new Error(
                `listing commits on pull request #${String(pull)} failed: ${response.status} ${response.statusText}`
            );
        }

        // justified: GitHub returns an array of commit objects for this route
        const commits = (await response.json()) as { author: Account | null }[];
        return commits.map((one) => humanLogin(one.author)).filter((login) => login !== undefined);
    }

    async labels(issue: number): Promise<string[]> {
        const response = await this.send('GET', `/repos/${this.repo}/issues/${issue}/labels`);
        if (!response.ok) {
            throw new Error(`listing labels on #${issue} failed: ${response.status} ${response.statusText}`);
        }

        // justified: GitHub returns an array of label objects for this route
        const found = (await response.json()) as { name: string }[];
        return found.map(({ name }) => name);
    }

    async addLabels(issue: number, labels: string[]): Promise<void> {
        await this.send('POST', `/repos/${this.repo}/issues/${issue}/labels`, { labels });
    }

    async removeLabel(issue: number, label: string): Promise<void> {
        await this.send('DELETE', `/repos/${this.repo}/issues/${issue}/labels/${encodeURIComponent(label)}`);
    }

    private send(method: string, path: string, body?: unknown): Promise<HttpResponse> {
        const sends = body !== undefined;

        return this.http(`${API}${path}`, {
            method,
            headers: {
                ...(this.token !== undefined && { authorization: `Bearer ${this.token}` }),
                accept: 'application/vnd.github+json',
                'x-github-api-version': API_VERSION,
                ...(sends && { 'content-type': 'application/json' })
            },
            ...(sends && { body: JSON.stringify(body) })
        });
    }
}

function encodePath(path: string): string {
    return path
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');
}
