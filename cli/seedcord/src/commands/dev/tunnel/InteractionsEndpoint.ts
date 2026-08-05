import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

import type { RESTGetCurrentApplicationResult, RESTPatchCurrentApplicationJSONBody } from 'discord-api-types/v10';

export type EndpointRest = Pick<REST, 'get' | 'patch'>;

export class InteractionsEndpoint {
    private client: EndpointRest | undefined;

    constructor(private readonly makeRest: () => EndpointRest) {}

    // the token read waits for a request, since the bot module might repoint envapt while it loads
    public static create(token: () => string): InteractionsEndpoint {
        return new InteractionsEndpoint(() => new REST({ version: '10' }).setToken(token()));
    }

    public async set(url: string): Promise<void> {
        const application = (await this.rest().get(Routes.currentApplication())) as RESTGetCurrentApplicationResult;
        if (application.interactions_endpoint_url === url) return;

        await this.write(url);
    }

    private rest(): EndpointRest {
        this.client ??= this.makeRest();
        return this.client;
    }

    public async clear(): Promise<void> {
        await this.write(null);
    }

    // discord probes the url on write, so the tunnel and the server must both answer first
    private async write(endpoint: string | null): Promise<void> {
        await this.rest().patch(Routes.currentApplication(), {
            body: { interactions_endpoint_url: endpoint } satisfies RESTPatchCurrentApplicationJSONBody
        });
    }
}
