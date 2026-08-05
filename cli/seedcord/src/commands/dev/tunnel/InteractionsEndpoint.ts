import { DiscordAPIError, REST } from '@discordjs/rest';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { RESTJSONErrorCodes, Routes } from 'discord-api-types/v10';

import type { RESTGetCurrentApplicationResult, RESTPatchCurrentApplicationJSONBody } from 'discord-api-types/v10';

const FIELD = 'interactions_endpoint_url';

export type EndpointRest = Pick<REST, 'get' | 'patch'>;

// discord verifies by posting a signed ping to the url, which fails until the hostname resolves on its side
function unverified(error: unknown): boolean {
    if (!(error instanceof DiscordAPIError) || error.code !== RESTJSONErrorCodes.InvalidFormBodyOrContentType) {
        return false;
    }

    const { rawError } = error;
    return 'errors' in rawError && typeof rawError.errors === 'object' && FIELD in rawError.errors;
}

export class InteractionsEndpoint {
    private client: EndpointRest | undefined;

    constructor(private readonly makeRest: () => EndpointRest) {}

    // the token is read per request, since the bot module can repoint envapt while it loads
    public static create(token: () => string): InteractionsEndpoint {
        // without this the client silently waits out an exhausted bucket and the cli looks frozen
        const rest = new REST({ version: '10', rejectOnRateLimit: ['/applications'] });
        return new InteractionsEndpoint(() => rest.setToken(token()));
    }

    public async set(url: string, signal: AbortSignal): Promise<void> {
        // justified: the discord api contract for this route
        const application = (await this.rest().get(Routes.currentApplication())) as RESTGetCurrentApplicationResult;
        if (application.interactions_endpoint_url === url) return;

        signal.throwIfAborted();
        try {
            await this.write(url);
        } catch (error: unknown) {
            if (!unverified(error)) throw error;
            throw new SeedcordError(SeedcordErrorCode.CliTunnelNotVerified, [url]);
        }
    }

    private rest(): EndpointRest {
        this.client ??= this.makeRest();
        return this.client;
    }

    public async clear(): Promise<void> {
        await this.write(null);
    }

    private async write(endpoint: string | null): Promise<void> {
        await this.rest().patch(Routes.currentApplication(), {
            body: { interactions_endpoint_url: endpoint } satisfies RESTPatchCurrentApplicationJSONBody
        });
    }
}
