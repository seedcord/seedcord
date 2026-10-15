import { EventEmitter } from 'node:events';

import { RESTEvents } from '@discordjs/rest';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { ApplicationCommandType, Routes } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

import { putCommands } from '#src/commands/putCommands';

import type { CommandScopes } from '#src/commands/putCommands';
import type { DeployResult } from '#src/commands/types';
import type { RateLimitData, REST } from '@discordjs/rest';
import type { APIApplicationCommand } from 'discord-api-types/v10';
import type { Mock } from 'vitest';

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

function deploy(scopes: Partial<CommandScopes>, rest: FakeRest, extra: { signal?: AbortSignal } = {}): Deploy {
    const warn = vi.fn();
    const onDeployed = vi.fn();
    const deploying = putCommands(
        { global: scopes.global ?? [], guilds: scopes.guilds ?? new Map() },
        {
            // justified: putCommands calls only put, on and off
            rest: rest as unknown as REST,
            applicationId: APP,
            logger: { warn },
            onDeployed,
            ...extra
        }
    );
    return { deploying, warn, onDeployed };
}

describe('putCommands', () => {
    it('puts the global commands to the application route and indexes the result by id', async () => {
        const put = vi.fn().mockResolvedValue(deployedAs('123', 'ping'));

        const result = await deploy({ global: [PING] }, restWith(put)).deploying;

        expect(put).toHaveBeenCalledWith(Routes.applicationCommands(APP), { body: [PING], signal: undefined });
        expect(result.global.get('123')?.name).toBe('ping');
    });

    it('puts each guild to its own route and skips an empty global scope', async () => {
        const put: Put = vi.fn().mockResolvedValue(deployedAs('g-1', 'config'));

        const result = await deploy({ guilds: new Map([['111', [CONFIG]]]) }, restWith(put)).deploying;

        expect(put.mock.calls.map(([route]) => route)).toEqual([Routes.applicationGuildCommands(APP, '111')]);
        expect(result.guilds.get('111')?.get('g-1')?.name).toBe('config');
    });

    it('puts nothing when every scope is empty', async () => {
        const put = vi.fn();

        const result = await deploy({}, restWith(put)).deploying;

        expect(put).not.toHaveBeenCalled();
        expect(result).toEqual({ global: new Map(), guilds: new Map() });
    });

    it('reports each scope once discord accepts it', async () => {
        const put = vi.fn().mockResolvedValue([]);

        const { deploying, onDeployed } = deploy(
            { global: [PING], guilds: new Map([['111', [CONFIG]]]) },
            restWith(put)
        );
        await deploying;

        expect(onDeployed.mock.calls).toEqual([
            [{ scope: 'global' }, [PING]],
            [{ scope: 'guild', guildId: '111' }, [CONFIG]]
        ]);
    });

    it('reports the guild whose deploy failed, keeping discord’s reason as the cause', async () => {
        const refused = new Error('Missing Access');

        const caught: unknown = await deploy(
            { guilds: new Map([['999', [CONFIG]]]) },
            restWith(vi.fn().mockRejectedValue(refused))
        ).deploying.catch((error: unknown) => error);

        expect(isSeedcordError(caught, undefined, SeedcordErrorCode.CoreCommandGuildDeployFailed)).toBe(true);
        expect(Error.isError(caught) ? caught.message : '').toContain('999');
        expect(Error.isError(caught) ? caught.cause : undefined).toBe(refused);
    });

    it('logs the wait when discord rate-limits the deploy', async () => {
        const { deploying, warn } = deploy(
            { global: [PING] },
            rateLimitedRest((route) => rateLimit('PUT', route))
        );
        await deploying;

        expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('60s'));
    });

    it('ignores a rate limit on another route while the deploy runs', async () => {
        const rest = rateLimitedRest(() => rateLimit('POST', '/channels/1/messages'));

        const { deploying, warn } = deploy({ global: [PING] }, rest);
        await deploying;

        expect(warn).not.toHaveBeenCalled();
    });

    it('stops reporting rate limits once the deploy finishes', async () => {
        const rest = restWith(vi.fn().mockResolvedValue(deployedAs('123', 'ping')));

        const { deploying, warn } = deploy({ global: [PING] }, rest);
        await deploying;
        rest.emit(RESTEvents.RateLimited, rateLimit('PUT', Routes.applicationCommands(APP)));

        expect(warn).not.toHaveBeenCalled();
    });

    it('stops waiting on discord once the deploy is aborted', async () => {
        // @discordjs/rest's rate-limit sleep ignores the signal
        const rest = restWith(vi.fn(() => new Promise<never>(() => undefined)));
        const controller = new AbortController();

        const { deploying } = deploy({ global: [PING] }, rest, { signal: controller.signal });
        controller.abort();

        await expect(deploying).rejects.toThrow(expect.objectContaining({ name: 'AbortError' }));
    });
});
