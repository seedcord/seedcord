import { DiscordAPIError } from '@discordjs/rest';
import { readBotToken } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { RESTJSONErrorCodes, Routes } from 'discord-api-types/v10';

import { restOf } from '#core/discord/restOf';

import type { REST } from '@discordjs/rest';
import type { BotToken } from '@seedcord/errors/internal';
import type { SeedcordInstance } from '@seedcord/types/internal';
import type { RESTPatchCurrentApplicationJSONBody } from 'discord-api-types/v10';

const FIELD = 'interactions_endpoint_url';

export type EndpointRest = Pick<REST, 'patch'>;

// discord verifies by posting a signed ping to the url, which fails until the hostname resolves on its side
function unverified(error: unknown): boolean {
    if (!(error instanceof DiscordAPIError) || error.code !== RESTJSONErrorCodes.InvalidFormBodyOrContentType) {
        return false;
    }

    const { rawError } = error;
    return 'errors' in rawError && containsField(rawError.errors);
}

function containsField(errors: unknown): boolean {
    return typeof errors === 'object' && errors !== null && FIELD in errors;
}

interface WrittenEndpoint {
    readonly applicationId: string;
    readonly url: string;
}

export class InteractionsEndpoint {
    private written: WrittenEndpoint | undefined;

    // read per request because a restart reloads .env and the bot
    constructor(
        private readonly token: () => BotToken,
        private readonly rest: () => EndpointRest
    ) {}

    public static create(instance: () => SeedcordInstance): InteractionsEndpoint {
        // without this the client silently waits out an exhausted bucket and the cli looks frozen
        return new InteractionsEndpoint(readBotToken, () =>
            restOf(instance(), { rejectOnRateLimit: ['/applications'] })
        );
    }

    public holds(url: string): boolean {
        return this.written?.url === url && this.written.applicationId === this.token().applicationId;
    }

    public async set(url: string, signal: AbortSignal): Promise<void> {
        signal.throwIfAborted();
        const { applicationId } = this.token();
        try {
            await this.write(url);
        } catch (error: unknown) {
            if (!unverified(error)) throw error;
            throw new SeedcordError(SeedcordErrorCode.CliTunnelNotVerified, [url]);
        }

        this.written = { applicationId, url };
    }

    public async clear(): Promise<void> {
        await this.write(null);
        this.written = undefined;
    }

    private async write(endpoint: string | null): Promise<void> {
        await this.rest().patch(Routes.currentApplication(), {
            body: { interactions_endpoint_url: endpoint } satisfies RESTPatchCurrentApplicationJSONBody
        });
    }
}
