import { delay } from 'es-toolkit';

import type { GitHubApi } from '#src/lib/GitHubApi';

const APPS = [
    { name: 'home', paths: ['apps/home/', 'tooling/ui/', 'tooling/brand/'] },
    {
        name: 'guide',
        paths: [
            'apps/guide/',
            'tooling/ui/',
            'tooling/brand/',
            'tooling/docs-search/',
            'scripts/src/guide/',
            'scripts/src/lib/CloudflareApi.ts'
        ]
    }
] as const;

type App = (typeof APPS)[number];

const ROLES_ALLOWED_TO_PREVIEW = new Set(['triage', 'write', 'maintain', 'admin']);
const WORKFLOW = 'site-preview.yml';
const TRUSTED_REF = 'next';
const BUILD_POLL_MS = 15_000;

interface PreviewPlan {
    sha: string;
    apps: App['name'][];
    artifactRun: number;
    workerRef: string;
}

const appsWhere = (matches: (app: App) => boolean): App['name'][] =>
    APPS.flatMap((app) => (matches(app) ? [app.name] : []));

export class PreviewPlanner {
    constructor(
        private readonly api: GitHubApi,
        private readonly pull: number
    ) {}

    async forPush(currentRun: number): Promise<PreviewPlan> {
        const [{ head }, files] = await Promise.all([
            this.api.pullRequest(this.pull),
            this.api.pullRequestFiles(this.pull)
        ]);
        const apps = appsWhere(({ paths }) =>
            files.some(({ filename }) => paths.some((path) => filename.startsWith(path)))
        );
        return { sha: head.sha, apps, artifactRun: currentRun, workerRef: head.sha };
    }

    async forComment(commenter: string): Promise<PreviewPlan> {
        const role = await this.api.collaboratorRole(commenter);
        if (!ROLES_ALLOWED_TO_PREVIEW.has(role)) {
            throw new Error(`${commenter} has the ${role} role. /preview needs triage or higher.`);
        }

        const {
            state,
            head: { sha }
        } = await this.api.pullRequest(this.pull);
        // the cleanup workflow only runs when a pull request closes
        if (state !== 'open') {
            throw new Error(`#${String(this.pull)} is ${state}. /preview only works on an open pull request.`);
        }

        const run = await this.finishedBuild(sha);
        if (run === undefined) {
            throw new Error(
                `${sha} doesn't have a ${WORKFLOW} run yet. Wait for its build to start, then /preview again.`
            );
        }
        if (run.conclusion !== 'success') {
            throw new Error(
                `${sha}'s ${WORKFLOW} run ended as ${String(run.conclusion)}. Approve or re-run it, then /preview again.`
            );
        }

        const artifacts = new Set(await this.api.artifactNames(run.id));
        return { sha, apps: appsWhere(({ name }) => artifacts.has(name)), artifactRun: run.id, workerRef: TRUSTED_REF };
    }

    private async finishedBuild(sha: string): ReturnType<GitHubApi['lastPullRequestRun']> {
        const run = await this.api.lastPullRequestRun(WORKFLOW, sha);
        if (run === undefined || run.status === 'completed') return run;
        await delay(BUILD_POLL_MS);
        return this.finishedBuild(sha);
    }
}
