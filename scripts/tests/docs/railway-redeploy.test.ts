import { describe, expect, it } from 'vitest';

import { RailwayRedeploy } from '#src/docs/RailwayRedeploy';

interface Reply {
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
}

type Fetcher = (
    url: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<Reply>;

interface FakeApi {
    // what each poll of the redeployed and the latest deployment reads, in order
    statuses?: string[];
    latestStatuses?: string[];
    services?: { id: string; name: string }[];
    errors?: unknown[];
    reply?: Reply;
}

interface Request {
    url: string;
    headers: Record<string, string>;
    operation: string;
    variables: Record<string, unknown>;
}

// answers each call by the operation name at the start of its query
function railway(api: FakeApi = {}): { requests: Request[]; fetcher: Fetcher } {
    const requests: Request[] = [];
    const statusesById: Record<string, string[]> = {
        'deploy-old': [...(api.latestStatuses ?? ['SUCCESS'])],
        'deploy-new': [...(api.statuses ?? ['SUCCESS'])]
    };
    const data: Record<string, (variables: Record<string, unknown>) => unknown> = {
        ProjectToken: () => ({ projectToken: { projectId: 'project-1', environmentId: 'env-1' } }),
        ProjectServices: () => ({
            project: {
                services: { edges: (api.services ?? [{ id: 'svc-1', name: 'docs' }]).map((node) => ({ node })) }
            }
        }),
        LatestDeployment: () => ({ serviceInstance: { latestDeployment: { id: 'deploy-old' } } }),
        DeploymentRedeploy: () => ({ deploymentRedeploy: { id: 'deploy-new' } }),
        DeploymentStatus: ({ id }) => ({ deployment: { status: statusesById[String(id)]?.shift() } })
    };

    const fetcher: Fetcher = (url, init) => {
        // justified: RailwayRedeploy always posts a JSON graphql body
        const body = JSON.parse(init?.body ?? '{}') as { query: string; variables?: Record<string, unknown> };
        const operation = /^(?:query|mutation) (\w+)/.exec(body.query)?.[1] ?? '';
        requests.push({ url, headers: init?.headers ?? {}, operation, variables: body.variables ?? {} });

        if (api.reply) return Promise.resolve(api.reply);

        const variables = body.variables ?? {};
        const payload = api.errors ? { errors: api.errors } : { data: data[operation]?.(variables) };
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(payload) });
    };

    return { requests, fetcher };
}

const noWait = (): Promise<void> => Promise.resolve();

describe('RailwayRedeploy', () => {
    it('redeploys the latest deployment of the service and returns once the new one succeeds', async () => {
        const { requests, fetcher } = railway({ statuses: ['BUILDING', 'DEPLOYING', 'SUCCESS'] });

        const id = await new RailwayRedeploy('token-1', fetcher, noWait).redeploy('docs');

        expect(id).toBe('deploy-new');
        expect(requests.find((r) => r.operation === 'DeploymentRedeploy')?.variables).toEqual({ id: 'deploy-old' });
        expect(requests.filter((r) => r.variables.id === 'deploy-new')).toHaveLength(3);
    });

    it('waits for a latest deployment that is still building before it redeploys', async () => {
        const { requests, fetcher } = railway({ latestStatuses: ['BUILDING', 'DEPLOYING', 'SUCCESS'] });

        await new RailwayRedeploy('token-1', fetcher, noWait).redeploy('docs');

        const operations = requests.map((r) => r.operation);
        const lastOldPoll = requests.findLastIndex(
            (r) => r.variables.id === 'deploy-old' && r.operation === 'DeploymentStatus'
        );
        expect(operations.indexOf('DeploymentRedeploy')).toBeGreaterThan(lastOldPoll);
        expect(
            requests.filter((r) => r.variables.id === 'deploy-old' && r.operation === 'DeploymentStatus')
        ).toHaveLength(3);
    });

    it('throws without redeploying when the latest deployment failed', async () => {
        const { requests, fetcher } = railway({ latestStatuses: ['FAILED'] });

        await expect(new RailwayRedeploy('token-1', fetcher, noWait).redeploy('docs')).rejects.toThrow(/FAILED/);
        expect(requests.map((r) => r.operation)).not.toContain('DeploymentRedeploy');
    });

    it('throws with the http status when railway answers with an error page', async () => {
        const { fetcher } = railway({
            reply: { ok: false, status: 502, json: () => Promise.reject(new SyntaxError('Unexpected token <')) }
        });

        await expect(new RailwayRedeploy('token-1', fetcher, noWait).redeploy('docs')).rejects.toThrow(/502/);
    });

    it('sends the token as a project access token to the public api', async () => {
        const { requests, fetcher } = railway();

        await new RailwayRedeploy('token-1', fetcher, noWait).redeploy('docs');

        expect(requests[0]?.url).toBe('https://backboard.railway.com/graphql/v2');
        expect(requests[0]?.headers['project-access-token']).toBe('token-1');
    });

    it('returns once the new deployment goes to sleep, since a sleeping deployment serves on the next request', async () => {
        const { fetcher } = railway({ statuses: ['DEPLOYING', 'SLEEPING'] });

        await expect(new RailwayRedeploy('token-1', fetcher, noWait).redeploy('docs')).resolves.toBe('deploy-new');
    });

    it.each(['FAILED', 'CRASHED', 'REMOVED', 'SKIPPED'])('throws when the new deployment ends %s', async (status) => {
        const { fetcher } = railway({ statuses: ['BUILDING', status] });

        await expect(new RailwayRedeploy('token-1', fetcher, noWait).redeploy('docs')).rejects.toThrow(status);
    });

    it('throws when the project has no service by that name', async () => {
        const { fetcher } = railway({ services: [{ id: 'svc-2', name: 'guide' }] });

        await expect(new RailwayRedeploy('token-1', fetcher, noWait).redeploy('docs')).rejects.toThrow(/docs/);
    });

    it('throws with the api error when railway rejects a request', async () => {
        const { fetcher } = railway({ errors: [{ message: 'Not Authorized' }] });

        await expect(new RailwayRedeploy('token-1', fetcher, noWait).redeploy('docs')).rejects.toThrow(
            /Not Authorized/
        );
    });
});
