const RAILWAY_API = 'https://backboard.railway.com/graphql/v2';
const POLL_MS = 10_000;
// railway's documented deployment statuses. a sleeping deployment wakes on its next request
const SERVING_STATUSES = new Set(['SUCCESS', 'SLEEPING']);
const FAILED_STATUSES = new Set(['FAILED', 'CRASHED', 'REMOVED', 'SKIPPED']);

interface HttpResponse {
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
}

type HttpFetch = (
    url: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<HttpResponse>;

interface ProjectToken {
    projectToken: { projectId: string; environmentId: string };
}

interface ProjectServices {
    project: { services: { edges: { node: { id: string; name: string } }[] } };
}

interface LatestDeployment {
    serviceInstance: { latestDeployment: { id: string } | null } | null;
}

interface Redeployed {
    deploymentRedeploy: { id: string };
}

interface DeploymentStatus {
    deployment: { status: string };
}

const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

export class RailwayRedeploy {
    constructor(
        private readonly token: string,
        private readonly http: HttpFetch = fetch,
        private readonly wait: (ms: number) => Promise<void> = sleep
    ) {}

    // resolves with the new deployment's id once it serves
    async redeploy(serviceName: string): Promise<string> {
        const { projectToken } = await this.request<ProjectToken>(
            'query ProjectToken { projectToken { projectId environmentId } }'
        );
        const { project } = await this.request<ProjectServices>(
            'query ProjectServices($id: String!) { project(id: $id) { services { edges { node { id name } } } } }',
            { id: projectToken.projectId }
        );
        const service = project.services.edges.find(({ node }) => node.name === serviceName)?.node;
        if (!service) throw new Error(`Railway project has no service named ${serviceName}`);

        const { serviceInstance } = await this.request<LatestDeployment>(
            'query LatestDeployment($serviceId: String!, $environmentId: String!) { serviceInstance(serviceId: $serviceId, environmentId: $environmentId) { latestDeployment { id } } }',
            { serviceId: service.id, environmentId: projectToken.environmentId }
        );
        const latest = serviceInstance?.latestDeployment;
        if (!latest) throw new Error(`Railway service ${serviceName} has no deployment to redeploy`);
        // railway won't redeploy a build still running from the push's own watchPatterns
        await this.untilServing(latest.id);

        const { deploymentRedeploy } = await this.request<Redeployed>(
            'mutation DeploymentRedeploy($id: String!) { deploymentRedeploy(id: $id) { id } }',
            { id: latest.id }
        );
        await this.untilServing(deploymentRedeploy.id);
        return deploymentRedeploy.id;
    }

    private async untilServing(id: string): Promise<void> {
        for (;;) {
            const { deployment } = await this.request<DeploymentStatus>(
                'query DeploymentStatus($id: String!) { deployment(id: $id) { status } }',
                { id }
            );
            if (SERVING_STATUSES.has(deployment.status)) return;
            if (FAILED_STATUSES.has(deployment.status)) {
                throw new Error(`Railway deployment ${id} ended ${deployment.status}`);
            }
            await this.wait(POLL_MS);
        }
    }

    private async request<Data>(query: string, variables: Record<string, string> = {}): Promise<Data> {
        const response = await this.http(RAILWAY_API, {
            method: 'POST',
            headers: { 'project-access-token': this.token, 'content-type': 'application/json' },
            body: JSON.stringify({ query, variables })
        });

        // justified: railway's graphql endpoint returns untyped JSON
        const result = (await response.json().catch(() => ({}))) as { data?: Data; errors?: unknown[] };
        if (!response.ok || result.errors || !result.data) {
            throw new Error(`Railway API failed (HTTP ${response.status}): ${JSON.stringify(result.errors)}`);
        }
        return result.data;
    }
}
