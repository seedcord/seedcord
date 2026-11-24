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

// the bot answers interactions on any path. on an edge bot, cloudflare answers a POST to a page at / with a
// 405 before the bot runs, and plugin routes are unlikely to sit under /__seedcord/
function interactionsUrl(tunnel: string): string {
    return new URL('__seedcord/interactions', tunnel.endsWith('/') ? tunnel : `${tunnel}/`).href;
}

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
    // quit clears after the edge session that bound .dev.vars has stopped
    readonly rest: EndpointRest;
}

export class InteractionsEndpoint {
    private written: WrittenEndpoint | undefined;

    // read per request because a restart reloads .env and the bot
    constructor(
        private readonly token: () => BotToken,
        private readonly rest: (instance: SeedcordInstance) => EndpointRest
    ) {}

    public static create(): InteractionsEndpoint {
        // without this the client silently waits out an exhausted bucket and the cli looks frozen
        return new InteractionsEndpoint(readBotToken, (instance) =>
            restOf(instance, { rejectOnRateLimit: ['/applications'] })
        );
    }

    // a restart that keeps the endpoint still brings a new bot, maybe with a reset token
    public reuse(url: string, instance: SeedcordInstance): boolean {
        const { written } = this;
        if (written?.url !== url || written.applicationId !== this.token().applicationId) return false;

        this.written = { ...written, rest: this.rest(instance) };
        return true;
    }

    public async set(url: string, signal: AbortSignal, instance: SeedcordInstance): Promise<void> {
        signal.throwIfAborted();
        const { applicationId } = this.token();
        const rest = this.rest(instance);
        const endpoint = interactionsUrl(url);
        try {
            await write(rest, endpoint);
        } catch (error: unknown) {
            if (!unverified(error)) throw error;
            throw new SeedcordError(SeedcordErrorCode.CliTunnelNotVerified, [endpoint]);
        }

        this.written = { applicationId, url, rest };
    }

    public async clear(): Promise<void> {
        if (!this.written) return;
        await write(this.written.rest, null);
        this.written = undefined;
    }
}

async function write(rest: EndpointRest, endpoint: string | null): Promise<void> {
    await rest.patch(Routes.currentApplication(), {
        body: { interactions_endpoint_url: endpoint } satisfies RESTPatchCurrentApplicationJSONBody
    });
}
