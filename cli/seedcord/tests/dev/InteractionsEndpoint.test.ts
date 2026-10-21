import { DiscordAPIError, RateLimitError, REST } from '@discordjs/rest';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { RESTJSONErrorCodes, Routes } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

import { InteractionsEndpoint } from '#commands/dev/tunnel/InteractionsEndpoint';
import { bindEnv } from '#tests/bindEnv';
import { FAKE_TOKEN } from '#tests/commands/build/smoke';
import { fakeDiscordApi } from '#tests/fakeDiscordApi';

import type { EndpointRest } from '#commands/dev/tunnel/InteractionsEndpoint';
import type { BotToken } from '@seedcord/errors/internal';
import type { SeedcordInstance } from '@seedcord/types/internal';

const TUNNEL = 'https://abc.trycloudflare.com';
const RUNNING = new AbortController().signal;
const TOKEN: BotToken = { value: 'first-token', applicationId: '1' };
// justified: these tests replace the rest factory, the only reader of the instance
const INSTANCE = {} as SeedcordInstance;

function endpointFor(client: EndpointRest): InteractionsEndpoint {
    return new InteractionsEndpoint(
        () => TOKEN,
        () => client
    );
}

function rest(): { rest: EndpointRest; patch: ReturnType<typeof vi.fn> } {
    const patch = vi.fn().mockResolvedValue({});
    return { rest: { patch }, patch };
}

// the rejection discord returns while the tunnel hostname is still unresolvable on its side
function unverifiable(): DiscordAPIError {
    return new DiscordAPIError(
        {
            code: RESTJSONErrorCodes.InvalidFormBodyOrContentType,
            message: 'Invalid Form Body',
            errors: {
                interactions_endpoint_url: {
                    _errors: [
                        {
                            code: 'APPLICATION_INTERACTIONS_ENDPOINT_URL_INVALID',
                            message: 'The specified interactions endpoint url could not be verified.'
                        }
                    ]
                }
            }
        },
        RESTJSONErrorCodes.InvalidFormBodyOrContentType,
        400,
        'PATCH',
        'https://discord.com/api/v10/applications/@me',
        { body: undefined, files: undefined }
    );
}

function refusalWith(errors: unknown): DiscordAPIError {
    return new DiscordAPIError(
        // justified: the field is typed as an optional object, and a null arrives on the wire
        { code: RESTJSONErrorCodes.InvalidFormBodyOrContentType, message: 'Invalid Form Body', errors } as never,
        RESTJSONErrorCodes.InvalidFormBodyOrContentType,
        400,
        'PATCH',
        'https://discord.com/api/v10/applications/@me',
        { body: undefined, files: undefined }
    );
}

describe('InteractionsEndpoint', () => {
    it("writes through the bot's own REST options", async () => {
        const discord = await fakeDiscordApi();
        using _env = bindEnv({ DISCORD_BOT_TOKEN: FAKE_TOKEN });
        // justified: create reads only rest off the instance
        const instance = { rest: new REST({ api: discord.api }) } as SeedcordInstance;

        await InteractionsEndpoint.create().set(TUNNEL, RUNNING, instance);

        expect(discord.routes).toEqual([Routes.currentApplication()]);
    });

    it('patches the application with the url', async () => {
        const { rest: client, patch } = rest();

        await endpointFor(client).set(TUNNEL, RUNNING, INSTANCE);

        expect(patch).toHaveBeenCalledExactlyOnceWith(Routes.currentApplication(), {
            body: { interactions_endpoint_url: TUNNEL }
        });
    });

    it('rethrows any other rejection without retrying', async () => {
        const { rest: client, patch } = rest();
        patch.mockRejectedValue(new Error('401 Unauthorized'));

        await expect(endpointFor(client).set(TUNNEL, RUNNING, INSTANCE)).rejects.toThrow('401');
        expect(patch).toHaveBeenCalledOnce();
    });

    it('translates a verification refusal into a seedcord error', async () => {
        const { rest: client, patch } = rest();
        patch.mockRejectedValue(unverifiable());

        const error: unknown = await endpointFor(client)
            .set(TUNNEL, RUNNING, INSTANCE)
            .then(
                () => null,
                (caught: unknown) => caught
            );

        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CliTunnelNotVerified)).toBe(true);
        expect(patch).toHaveBeenCalledOnce();
    });

    it('rethrows a refusal whose errors field is null', async () => {
        const { rest: client, patch } = rest();
        const refusal = refusalWith(null);
        patch.mockRejectedValue(refusal);

        await expect(endpointFor(client).set(TUNNEL, RUNNING, INSTANCE)).rejects.toBe(refusal);
    });

    it('surfaces a rate limit rather than reading it as a refusal', async () => {
        const { rest: client } = rest();
        const limited = new RateLimitError({
            timeToReset: 60_000,
            limit: 10,
            method: 'PATCH',
            hash: 'x',
            url: 'https://discord.com/api/v10/applications/@me',
            route: '/applications/@me',
            majorParameter: '',
            global: false,
            retryAfter: 60_000,
            sublimitTimeout: 0,
            scope: 'user'
        });
        client.patch = vi.fn().mockRejectedValue(limited);

        await expect(endpointFor(client).set(TUNNEL, RUNNING, INSTANCE)).rejects.toBe(limited);
    });

    it('writes nothing once the attempt is aborted', async () => {
        const { rest: client, patch } = rest();
        const attempt = new AbortController();
        attempt.abort();

        await expect(endpointFor(client).set(TUNNEL, attempt.signal, INSTANCE)).rejects.toThrow();
        expect(patch).not.toHaveBeenCalled();
    });

    it('clears the url it set with a null and writes nothing before a set', async () => {
        const { rest: client, patch } = rest();
        const endpoint = endpointFor(client);

        await endpoint.clear();
        expect(patch).not.toHaveBeenCalled();

        await endpoint.set(TUNNEL, RUNNING, INSTANCE);
        await endpoint.clear();
        expect(patch).toHaveBeenLastCalledWith(Routes.currentApplication(), {
            body: { interactions_endpoint_url: null }
        });
    });

    it('clears with the token it set with, after the session that loaded it stopped', async () => {
        const { endpoint, writtenWith, readToken } = recordingEndpoint();

        await endpoint.set(TUNNEL, RUNNING, INSTANCE);
        readToken(unset);
        await endpoint.clear();

        expect(writtenWith).toEqual(['first-token', 'first-token']);
    });

    it('reuses the url only for a restarted bot of the same application, then clears with its token', async () => {
        const { endpoint, writtenWith, readToken } = recordingEndpoint();
        await endpoint.set(TUNNEL, RUNNING, INSTANCE);

        readToken(() => ({ value: 'reset-token', applicationId: TOKEN.applicationId }));
        expect(endpoint.reuse(TUNNEL, INSTANCE)).toBe(true);
        readToken(() => ({ value: 'other-app-token', applicationId: '2' }));
        expect(endpoint.reuse(TUNNEL, INSTANCE)).toBe(false);

        readToken(unset);
        await endpoint.clear();
        expect(writtenWith).toEqual(['first-token', 'reset-token']);
    });
});

// what readBotToken does once the session that bound .dev.vars has stopped
function unset(): BotToken {
    throw new Error('DISCORD_BOT_TOKEN is unset');
}

// each client records the token it was built with
function recordingEndpoint(): {
    endpoint: InteractionsEndpoint;
    writtenWith: string[];
    readToken: (next: () => BotToken) => void;
} {
    const writtenWith: string[] = [];
    let token = (): BotToken => TOKEN;
    const endpoint = new InteractionsEndpoint(
        () => token(),
        () => {
            const { value } = token();
            return { patch: () => Promise.resolve(writtenWith.push(value)) };
        }
    );
    return { endpoint, writtenWith, readToken: (next) => (token = next) };
}
