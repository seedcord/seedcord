const API = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const PAGE_SIZE = 100;

interface PullRequestFile {
    filename: string;
    status: string;
    previous_filename?: string;
}

interface Account {
    login: string;
    type: string;
}

interface PullRequest {
    state: string;
    draft: boolean;
    user: Account | null;
    requested_reviewers: Account[];
    head: { sha: string };
}

interface WorkflowRun {
    id: number;
    status: string;
    conclusion: string | null;
}

const humanLogin = (account: Account | null | undefined): string | undefined =>
    account && account.type !== 'Bot' ? account.login : undefined;

export class GitHubApi {
    constructor(
        private readonly repo: string,
        private readonly token?: string,
        private readonly http: typeof fetch = fetch
    ) {}

    pullRequestFiles(pull: number): Promise<PullRequestFile[]> {
        return this.list(`pulls/${String(pull)}/files`, `listing files on pull request #${String(pull)}`);
    }

    async fileContents(path: string, ref: string): Promise<string> {
        const encodedPath = path.split('/').map(encodeURIComponent).join('/');
        const { content } = await this.get<{ content: string }>(
            `contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
            `reading ${path}`
        );
        return Buffer.from(content, 'base64').toString('utf8');
    }

    async pullRequestAuthor(pull: number): Promise<string | undefined> {
        const { user } = await this.pullRequest(pull);
        return humanLogin(user);
    }

    pullRequest(pull: number): Promise<PullRequest> {
        return this.get(`pulls/${String(pull)}`, `reading pull request #${String(pull)}`);
    }

    async collaboratorRole(login: string): Promise<string> {
        const { role_name: role } = await this.get<{ role_name: string }>(
            `collaborators/${encodeURIComponent(login)}/permission`,
            `reading the role of ${login}`
        );
        return role;
    }

    async lastPullRequestRun(workflow: string, sha: string): Promise<WorkflowRun | undefined> {
        const { workflow_runs: runs } = await this.get<{ workflow_runs: WorkflowRun[] }>(
            `actions/workflows/${workflow}/runs?head_sha=${sha}&event=pull_request&per_page=1`,
            `listing ${workflow} runs for ${sha}`
        );
        return runs[0];
    }

    async artifactNames(run: number): Promise<string[]> {
        const { artifacts } = await this.get<{ artifacts: { name: string }[] }>(
            `actions/runs/${String(run)}/artifacts`,
            `listing artifacts of run ${String(run)}`
        );
        return artifacts.map(({ name }) => name);
    }

    async requestMissingReviews(pull: number, reviewers: readonly string[]): Promise<void> {
        const current = await this.pullRequest(pull);
        if (current.draft || current.state !== 'open') return;

        const path = `pulls/${String(pull)}`;
        const reviews = await this.list<Pick<PullRequest, 'user'>>(
            `${path}/reviews`,
            `listing reviews on pull request #${String(pull)}`
        );
        const excluded = new Set(
            [
                current.user?.login,
                ...current.requested_reviewers.map(({ login }) => login),
                ...reviews.map(({ user }) => user?.login)
            ]
                .filter((login) => login !== undefined)
                .map((login) => login.toLowerCase())
        );
        const pending = reviewers.filter((login) => !excluded.has(login.toLowerCase()));
        if (pending.length === 0) return;

        await this.send('POST', `${path}/requested_reviewers`, `requesting reviews on pull request #${String(pull)}`, {
            reviewers: pending
        });
    }

    async pullRequestCommitAuthors(pull: number): Promise<string[]> {
        const commits = await this.list<{ author: Account | null }>(
            `pulls/${String(pull)}/commits`,
            `listing commits on pull request #${String(pull)}`
        );
        return commits.map(({ author }) => humanLogin(author)).filter((login) => login !== undefined);
    }

    async labels(issue: number): Promise<string[]> {
        const labels = await this.list<{ name: string }>(
            `issues/${String(issue)}/labels`,
            `listing labels on #${String(issue)}`
        );
        return labels.map(({ name }) => name);
    }

    async addLabels(issue: number, labels: string[]): Promise<void> {
        await this.send('POST', `issues/${String(issue)}/labels`, `adding ${labels.join(', ')} to #${String(issue)}`, {
            labels
        });
    }

    async removeLabel(issue: number, label: string): Promise<void> {
        await this.send(
            'DELETE',
            `issues/${String(issue)}/labels/${encodeURIComponent(label)}`,
            `removing ${label} from #${String(issue)}`
        );
    }

    private async get<Payload>(path: string, what: string): Promise<Payload> {
        const response = await this.send('GET', path, what);
        return (await response.json()) as Payload;
    }

    private async list<Item>(path: string, what: string): Promise<Item[]> {
        const items: Item[] = [];
        for (let page = 1; ; page++) {
            const batch = await this.get<Item[]>(`${path}?per_page=${String(PAGE_SIZE)}&page=${String(page)}`, what);
            items.push(...batch);
            if (batch.length < PAGE_SIZE) return items;
        }
    }

    private async send(method: string, path: string, what: string, body?: unknown): Promise<Response> {
        const sends = body !== undefined;
        const response = await this.http(`${API}/repos/${this.repo}/${path}`, {
            method,
            headers: {
                ...(this.token !== undefined && { authorization: `Bearer ${this.token}` }),
                accept: 'application/vnd.github+json',
                'x-github-api-version': API_VERSION,
                ...(sends && { 'content-type': 'application/json' })
            },
            ...(sends && { body: JSON.stringify(body) })
        });
        if (!response.ok) throw new Error(`${what} failed: ${String(response.status)} ${response.statusText}`);
        return response;
    }
}
