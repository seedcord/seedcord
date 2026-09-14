const API = 'https://api.github.com';
// justified: every response cast below matches GitHub's REST schema for this version
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

interface PullRequestFile {
    filename: string;
    status: string;
}

interface Account {
    login: string;
    type: string;
}

const humanLogin = (account: Account | null | undefined): string | undefined =>
    account && account.type !== 'Bot' ? account.login : undefined;

const failed = (what: string, response: HttpResponse): Error =>
    new Error(`${what} failed: ${String(response.status)} ${response.statusText}`);

export class GitHubApi {
    constructor(
        private readonly repo: string,
        private readonly token?: string,
        private readonly http: HttpFetch = fetch
    ) {}

    async pullRequestFiles(pull: number): Promise<PullRequestFile[]> {
        const files: PullRequestFile[] = [];

        for (let page = 1; ; page++) {
            const path = `/repos/${this.repo}/pulls/${String(pull)}/files?per_page=${String(PAGE_SIZE)}&page=${String(page)}`;
            const response = await this.send('GET', path);
            if (!response.ok) throw failed(`listing files on pull request #${String(pull)}`, response);

            const batch = (await response.json()) as PullRequestFile[];
            files.push(...batch);
            if (batch.length < PAGE_SIZE) return files;
        }
    }

    async fileContents(path: string, ref: string): Promise<string> {
        const response = await this.send('GET', `/repos/${this.repo}/contents/${encodePath(path)}?ref=${ref}`);
        if (!response.ok) throw failed(`reading ${path}`, response);

        const { content } = (await response.json()) as { content: string };
        return Buffer.from(content, 'base64').toString('utf8');
    }

    async pullRequestAuthor(pull: number): Promise<string | undefined> {
        const response = await this.send('GET', `/repos/${this.repo}/pulls/${String(pull)}`);
        if (!response.ok) throw failed(`reading pull request #${String(pull)}`, response);

        const { user } = (await response.json()) as { user: Account | null };
        return humanLogin(user);
    }

    async pullRequestCommitAuthors(pull: number): Promise<string[]> {
        const authors: string[] = [];

        for (let page = 1; ; page++) {
            const path = `/repos/${this.repo}/pulls/${String(pull)}/commits?per_page=${String(PAGE_SIZE)}&page=${String(page)}`;
            const response = await this.send('GET', path);
            if (!response.ok) throw failed(`listing commits on pull request #${String(pull)}`, response);

            const batch = (await response.json()) as { author: Account | null }[];
            authors.push(...batch.map((one) => humanLogin(one.author)).filter((login) => login !== undefined));
            if (batch.length < PAGE_SIZE) return authors;
        }
    }

    async labels(issue: number): Promise<string[]> {
        const response = await this.send('GET', `/repos/${this.repo}/issues/${String(issue)}/labels`);
        if (!response.ok) throw failed(`listing labels on #${String(issue)}`, response);

        const found = (await response.json()) as { name: string }[];
        return found.map(({ name }) => name);
    }

    async addLabels(issue: number, labels: string[]): Promise<void> {
        const response = await this.send('POST', `/repos/${this.repo}/issues/${String(issue)}/labels`, { labels });
        if (!response.ok) throw failed(`adding ${labels.join(', ')} to #${String(issue)}`, response);
    }

    async removeLabel(issue: number, label: string): Promise<void> {
        const path = `/repos/${this.repo}/issues/${String(issue)}/labels/${encodeURIComponent(label)}`;
        const response = await this.send('DELETE', path);
        if (!response.ok) throw failed(`removing ${label} from #${String(issue)}`, response);
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
