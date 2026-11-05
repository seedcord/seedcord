import { appendFile } from 'node:fs/promises';

import { Converters, Envapter } from 'envapt';

import { GitHubApi } from '#src/lib/GitHubApi';
import { PreviewPlanner } from '#src/preview/PreviewPlanner';

Envapter.strict = true;

const env = Envapter.getRequiredAll({
    GITHUB_OUTPUT: Converters.String,
    GITHUB_REPOSITORY: Converters.String,
    GITHUB_RUN_ID: Converters.Integer,
    GITHUB_TOKEN: Converters.String,
    PR_NUMBER: Converters.Integer
});
const commenter = Envapter.get('COMMENTER');

const planner = new PreviewPlanner(new GitHubApi(env.GITHUB_REPOSITORY, env.GITHUB_TOKEN), env.PR_NUMBER);
const plan = commenter === undefined ? await planner.forPush(env.GITHUB_RUN_ID) : await planner.forComment(commenter);

await appendFile(
    env.GITHUB_OUTPUT,
    [
        `pr=${String(env.PR_NUMBER)}`,
        `sha=${plan.sha}`,
        `apps=${JSON.stringify(plan.apps)}`,
        `artifact_run=${String(plan.artifactRun)}`,
        `worker_ref=${plan.workerRef}`,
        ''
    ].join('\n')
);
