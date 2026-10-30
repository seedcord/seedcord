import { EventEmitter } from 'node:events';

import { DiscordAPIError, RESTEvents } from '@discordjs/rest';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { ApplicationCommandType, Routes } from 'discord-api-types/v10';
import { assert, describe, expect, it, vi } from 'vite-plus/test';

import { putCommands } from '#src/commands/putCommands';
import { GLOBAL_ID } from '#src/commands/scopes';

import type { CommandBody } from '#src/commands/putCommands';
import type { ScopeId } from '#src/commands/scopes';
import type { DeployResult } from '#src/commands/types';
import type { RateLimitData, REST } from '@discordjs/rest';
import type { APIApplicationCommand } from 'discord-api-types/v10';
import type { Mock } from 'vite-plus/test';

const APP = 'app-1';
const PING = { name: 'ping', description: 'Replies with Pong!' };
const CONFIG = { name: 'config', description: 'Config' };

type Put = Mock<(route: string, options: { body: unknown; signal?: AbortSignal }) => Promise<unknown>>;
type FakeRest = EventEmitter & { put: Put };

interface Deploy {
    deploying: Promise<DeployResult>;
    warn: Mock;
    onDeployed: Mock;
}

function deployedAs(id: string, name: string): APIApplicationCommand[] {
    // justified: the tests read only id and name
    return [{ id, name, type: ApplicationCommandType.ChatInput } as APIApplicationCommand];
}

function restWith(put: Put = vi.fn()): FakeRest {
    return Object.assign(new EventEmitter(), { put });
}

function rateLimit(method: string, route: string, waitMs = 59_747): RateLimitData {
    // justified: the rate-limit report reads only these fields
    return { method, url: `https://discord.com/api/v10${route}`, timeToReset: waitMs } as RateLimitData;
}

// @discordjs/rest emits rateLimited before it waits out timeToReset
function rateLimitedRest(limited: (route: string) => RateLimitData): FakeRest {
    const rest = restWith();
    rest.put.mockImplementation((route) => {
        rest.emit(RESTEvents.RateLimited, limited(route));
        return Promise.resolve(deployedAs('123', 'ping'));
    });
    return rest;
}

// the errors @discordjs/rest throws for a 401 and for a body that fails discord's validation
function discordRefusal(status: 400 | 401): DiscordAPIError {
    const rawError =
        status === 401
            ? { message: '401: Unauthorized', code: 0 }
            : {
                  message: 'Invalid Form Body',
                  code: 50_035,
                  errors: {
                      0: {
                          description: { _errors: [{ code: 'BASE_TYPE_REQUIRED', message: 'This field is required' }] }
                      }
                  }
              };
    return new DiscordAPIError(rawError, rawError.code, status, 'PUT', 'https://discord.com/api/v10', {});
}

async function deployFailure(scope: ScopeId, refusal: DiscordAPIError): Promise<Error> {
    const rest = restWith(vi.fn().mockRejectedValue(refusal));
    const caught: unknown = await deploy([[scope, [PING]]], rest).deploying.catch((error: unknown) => error);
    assert(Error.isError(caught));
    return caught;
}

function deploy(scopes: [ScopeId, CommandBody[]][], rest: FakeRest, extra: { signal?: AbortSignal } = {}): Deploy {
    const warn = vi.fn();
    const onDeployed = vi.fn();
    const deploying = putCommands(new Map(scopes), {
        // justified: putCommands calls only put, on and off
        rest: rest as unknown as REST,
        applicationId: APP,
        logger: { warn },
        onDeployed,
        ...extra
    });
    return { deploying, warn, onDeployed };
}

describe('putCommands', () => {
    it('puts the global commands to the application route and indexes the result by id', async () => {
        const put = vi.fn().mockResolvedValue(deployedAs('123', 'ping'));

        const result = await deploy([[GLOBAL_ID, [PING]]], restWith(put)).deploying;

        expect(put).toHaveBeenCalledWith(Routes.applicationCommands(APP), { body: [PING], signal: undefined });
        expect(result.get(GLOBAL_ID)?.get('123')?.name).toBe('ping');
    });

    it('puts each guild to its own route and leaves the global scope alone when none is given', async () => {
        const put: Put = vi.fn().mockResolvedValue(deployedAs('g-1', 'config'));

        const result = await deploy([['111', [CONFIG]]], restWith(put)).deploying;

        expect(put.mock.calls.map(([route]) => route)).toEqual([Routes.applicationGuildCommands(APP, '111')]);
        expect(result.get('111')?.get('g-1')?.name).toBe('config');
    });

    it('puts an empty global list, which clears every global command', async () => {
        const put: Put = vi.fn().mockResolvedValue([]);

        await deploy([[GLOBAL_ID, []]], restWith(put)).deploying;

        expect(put).toHaveBeenCalledWith(Routes.applicationCommands(APP), { body: [], signal: undefined });
    });

    it('puts nothing when no scope is given', async () => {
        const put = vi.fn();

        const result = await deploy([], restWith(put)).deploying;

        expect(put).not.toHaveBeenCalled();
        expect(result).toEqual(new Map());
    });

    it('reports each scope once discord accepts it', async () => {
        const put = vi.fn().mockResolvedValue([]);

        const { deploying, onDeployed } = deploy(
            [
                [GLOBAL_ID, [PING]],
                ['111', [CONFIG]]
            ],
            restWith(put)
        );
        await deploying;

        expect(onDeployed.mock.calls).toEqual([
            [GLOBAL_ID, [PING]],
            ['111', [CONFIG]]
        ]);
    });

    it('reports the guild whose deploy discord refused, pointing at the token on a 401', async () => {
        const refusal = discordRefusal(401);

        const error = await deployFailure('999', refusal);

        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CoreCommandGuildDeployFailed)).toBe(true);
        expect(error.cause).toBe(refusal);
        expect(error.message).toContain('999');
        expect(error.message).toContain('DISCORD_BOT_TOKEN');
        expect(error.message).not.toContain('in that server');
    });

    it('shows which field discord rejected when the global commands fail its validation', async () => {
        const refusal = discordRefusal(400);

        const error = await deployFailure(GLOBAL_ID, refusal);

        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CoreCommandGlobalDeployFailed)).toBe(true);
        expect(error.cause).toBe(refusal);
        expect(error.message).toContain('0.description[BASE_TYPE_REQUIRED]: This field is required');
        expect(error.message).toContain('description and options');
    });

    it('points at the token when discord rejects it during the global deploy', async () => {
        const { message } = await deployFailure(GLOBAL_ID, discordRefusal(401));

        expect(message).toContain('401: Unauthorized');
        expect(message).toContain('DISCORD_BOT_TOKEN');
        expect(message).not.toContain('description and options');
    });

    it('logs the wait when discord rate-limits the deploy', async () => {
        const { deploying, warn } = deploy(
            [[GLOBAL_ID, [PING]]],
            rateLimitedRest((route) => rateLimit('PUT', route))
        );
        await deploying;

        expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('60s'));
    });

    it('ignores a rate limit on another route while the deploy runs', async () => {
        const rest = rateLimitedRest(() => rateLimit('POST', '/channels/1/messages'));

        const { deploying, warn } = deploy([[GLOBAL_ID, [PING]]], rest);
        await deploying;

        expect(warn).not.toHaveBeenCalled();
    });

    it('stops reporting rate limits once the deploy finishes', async () => {
        const rest = restWith(vi.fn().mockResolvedValue(deployedAs('123', 'ping')));

        const { deploying, warn } = deploy([[GLOBAL_ID, [PING]]], rest);
        await deploying;
        rest.emit(RESTEvents.RateLimited, rateLimit('PUT', Routes.applicationCommands(APP)));

        expect(warn).not.toHaveBeenCalled();
    });

    it('stops waiting on discord once the deploy is aborted', async () => {
        // @discordjs/rest's rate-limit sleep ignores the signal
        const rest = restWith(vi.fn(() => new Promise<never>(() => undefined)));
        const controller = new AbortController();

        const { deploying } = deploy([[GLOBAL_ID, [PING]]], rest, { signal: controller.signal });
        controller.abort();

        await expect(deploying).rejects.toThrow(expect.objectContaining({ name: 'AbortError' }));
    });

    it('rejects an aborted guild deploy with the abort itself', async () => {
        const rest = restWith(vi.fn(() => new Promise<never>(() => undefined)));
        const controller = new AbortController();

        const { deploying } = deploy([['999', [CONFIG]]], rest, { signal: controller.signal });
        controller.abort();

        await expect(deploying).rejects.toThrow(expect.objectContaining({ name: 'AbortError' }));
    });
});
