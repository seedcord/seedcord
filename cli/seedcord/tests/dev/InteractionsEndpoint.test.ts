import { DiscordAPIError } from '@discordjs/rest';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { RESTJSONErrorCodes, Routes } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

import { InteractionsEndpoint } from '@commands/dev/tunnel/InteractionsEndpoint';

import type { EndpointRest } from '@commands/dev/tunnel/InteractionsEndpoint';

const TUNNEL = 'https://abc.trycloudflare.com';
const RUNNING = new AbortController().signal;
const skipWait = (): Promise<void> => Promise.resolve();
const noRetry = (): void => undefined;

function rest(current: string | null): { rest: EndpointRest; patch: ReturnType<typeof vi.fn> } {
    const patch = vi.fn().mockResolvedValue({});
    // justified: the endpoint reads only the get and patch surface of the rest client
    return {
        rest: {
            get: vi.fn().mockResolvedValue({ interactions_endpoint_url: current }),
            patch
        },
        patch
    };
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

describe('InteractionsEndpoint', () => {
    // the bot module points envapt at its own .env while loading, so the token read waits for a request
    it('builds its rest client on the first request', async () => {
        const { rest: client } = rest(null);
        const makeRest = vi.fn(() => client);
        const endpoint = new InteractionsEndpoint(makeRest, skipWait);

        expect(makeRest).not.toHaveBeenCalled();

        await endpoint.set(TUNNEL, RUNNING, noRetry);
        await endpoint.set(TUNNEL, RUNNING, noRetry);

        expect(makeRest).toHaveBeenCalledOnce();
    });

    it('patches the application when the endpoint differs', async () => {
        const { rest: client, patch } = rest('https://stale.trycloudflare.com');

        await new InteractionsEndpoint(() => client, skipWait).set(TUNNEL, RUNNING, noRetry);

        expect(patch).toHaveBeenCalledExactlyOnceWith(Routes.currentApplication(), {
            body: { interactions_endpoint_url: TUNNEL }
        });
    });

    it('skips the patch when the endpoint already matches', async () => {
        const { rest: client, patch } = rest(TUNNEL);

        await new InteractionsEndpoint(() => client, skipWait).set(TUNNEL, RUNNING, noRetry);

        expect(patch).not.toHaveBeenCalled();
    });

    it('patches an application that has no endpoint set', async () => {
        const { rest: client, patch } = rest(null);

        await new InteractionsEndpoint(() => client, skipWait).set(TUNNEL, RUNNING, noRetry);

        expect(patch).toHaveBeenCalledOnce();
    });

    it('retries the patch while discord cannot verify the url yet', async () => {
        const { rest: client, patch } = rest(null);
        patch.mockRejectedValueOnce(unverifiable()).mockResolvedValueOnce({});

        await new InteractionsEndpoint(() => client, skipWait).set(TUNNEL, RUNNING, noRetry);

        expect(patch).toHaveBeenCalledTimes(2);
    });

    it('rethrows any other rejection without retrying', async () => {
        const { rest: client, patch } = rest(null);
        patch.mockRejectedValue(new Error('401 Unauthorized'));

        await expect(new InteractionsEndpoint(() => client, skipWait).set(TUNNEL, RUNNING, noRetry)).rejects.toThrow(
            '401'
        );
        expect(patch).toHaveBeenCalledOnce();
    });

    it('gives up once discord has refused for the whole budget', async () => {
        const { rest: client, patch } = rest(null);
        patch.mockRejectedValue(unverifiable());

        const error: unknown = await new InteractionsEndpoint(() => client, skipWait)
            .set(TUNNEL, RUNNING, noRetry)
            .then(
                () => null,
                (caught: unknown) => caught
            );

        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CliTunnelNotVerified)).toBe(true);
    });

    it('writes nothing once the attempt is aborted', async () => {
        const { rest: client, patch } = rest(null);
        const attempt = new AbortController();
        attempt.abort();

        await expect(
            new InteractionsEndpoint(() => client, skipWait).set(TUNNEL, attempt.signal, noRetry)
        ).rejects.toThrow();
        expect(patch).not.toHaveBeenCalled();
    });

    it('clears the endpoint with a null', async () => {
        const { rest: client, patch } = rest(TUNNEL);

        await new InteractionsEndpoint(() => client, skipWait).clear();

        expect(patch).toHaveBeenCalledExactlyOnceWith(Routes.currentApplication(), {
            body: { interactions_endpoint_url: null }
        });
    });
});
