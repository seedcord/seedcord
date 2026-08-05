import { DiscordAPIError, REST } from '@discordjs/rest';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { RESTJSONErrorCodes, Routes } from 'discord-api-types/v10';

import type { RESTGetCurrentApplicationResult, RESTPatchCurrentApplicationJSONBody } from 'discord-api-types/v10';

const FIELD = 'interactions_endpoint_url';
const RETRY_INTERVAL_MS = 3000;
const RETRY_ATTEMPTS = 40;

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

    constructor(
        private readonly makeRest: () => EndpointRest,
        private readonly wait: (ms: number) => Promise<void>
    ) {}

    // the token read waits for a request, since the bot module might repoint envapt while it loads
    public static create(token: () => string, wait: (ms: number) => Promise<void>): InteractionsEndpoint {
        return new InteractionsEndpoint(() => new REST({ version: '10' }).setToken(token()), wait);
    }

    public async set(url: string, signal: AbortSignal): Promise<void> {
        // justified: the discord api contract for this route
        const application = (await this.rest().get(Routes.currentApplication())) as RESTGetCurrentApplicationResult;
        if (application.interactions_endpoint_url === url) return;

        for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
            signal.throwIfAborted();
            try {
                await this.write(url);
                return;
            } catch (error: unknown) {
                if (!unverified(error)) throw error;
            }
            await this.wait(RETRY_INTERVAL_MS);
        }

        throw new SeedcordError(SeedcordErrorCode.CliTunnelNotVerified, [
            url,
            (RETRY_ATTEMPTS * RETRY_INTERVAL_MS) / 1000
        ]);
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
