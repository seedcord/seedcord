import { MemoryDriver } from '@seedcord/core';
import { bindEnv } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { captureLogs } from '@seedcord/logger/internal';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vite-plus/test';

import { LinkedRoles, RecordType } from '#src/index';

import { fakeDiscord } from './fakeDiscord';
import { APP_ID, MapDriver, SERVER_URL_UNSET, TestHost } from './host';

import type { LinkedRoleRecords } from '#src/index';
import type { SeenRequest } from './fakeDiscord';

const level = { type: RecordType.IntegerGreaterThanOrEqual, name: 'Level', description: 'Your level' } as const;

describe('LinkedRoles startup', () => {
    interface Start {
        host?: Partial<ConstructorParameters<typeof TestHost>[0]>;
        env?: Record<string, string>;
        records?: LinkedRoleRecords;
        keepTokens?: boolean;
    }

    function initError({
        host,
        env = { DISCORD_CLIENT_SECRET: 's' },
        records = { level },
        keepTokens = false
    }: Start = {}): unknown {
        const Attached = LinkedRoles.with({ records, keepTokens, values: () => 'Not yet.' });
        const { linkedRoles } = new TestHost({ api: 'http://discord.test/api', ...host }).attach(
            'linkedRoles',
            Attached
        );
        using _env = bindEnv(Envapter, new PortableSource(env));
        try {
            linkedRoles.init();
            return undefined;
        } catch (error) {
            return error;
        }
    }

    it("starts on the default in-memory `kv` when it doesn't keep tokens", () => {
        expect(initError({ host: { kv: new MemoryDriver() } })).toBeUndefined();
    });

    it("stops when the bot doesn't set `server.url`", () => {
        expect(initError({ host: { url: SERVER_URL_UNSET } })).toMatchObject({
            code: SeedcordErrorCode.CoreServerUrlUnset
        });
    });

    it('stops when `DISCORD_CLIENT_SECRET` is unset', () => {
        const error = initError({ env: {} });

        expect(error).toMatchObject({ code: SeedcordErrorCode.ConfigMissingEnv });
        expect(String(error)).toContain('DISCORD_CLIENT_SECRET');
    });

    it("stops on records that break one of Discord's limits", () => {
        const error = initError({ records: { 'top-level': level } });

        expect(error).toMatchObject({ code: SeedcordErrorCode.PluginOptionsRejected });
        expect(String(error)).toContain('top-level');
    });

    it('stops when it keeps tokens and `kv` is the default in-memory driver', () => {
        expect(initError({ keepTokens: true, host: { kv: new MemoryDriver() } })).toMatchObject({
            code: SeedcordErrorCode.PluginOAuthTokensInMemory
        });
    });

    it('starts when it keeps tokens in a `kv` that saves them', () => {
        expect(initError({ keepTokens: true })).toBeUndefined();
    });

    it('attaches as a class called `LinkedRoles`, the name that the logger shows', () => {
        expect(LinkedRoles.with({ records: { level }, values: () => 'Not yet.' }).name).toBe('LinkedRoles');
    });
});

describe('LinkedRoles portal sync', () => {
    const CALLBACK = 'https://bot.test/linked-roles/callback';
    const RECORDS_ROUTE = `/applications/${APP_ID}/role-connections/metadata`;

    interface Bot {
        linkedRoles: LinkedRoles<LinkedRoleRecords>;
        requests: SeenRequest[];
    }

    async function botWith({
        records = { level },
        redirects = [CALLBACK],
        answer = () => ({ json: { redirect_uris: redirects } }),
        host = {}
    }: {
        records?: LinkedRoleRecords;
        redirects?: string[];
        answer?: Parameters<typeof fakeDiscord>[0];
        host?: Partial<ConstructorParameters<typeof TestHost>[0]>;
    } = {}): Promise<Bot> {
        const discord = await fakeDiscord(answer);
        const { linkedRoles } = new TestHost({ api: discord.api, ...host }).attach(
            'linkedRoles',
            LinkedRoles.with({ records, values: () => 'Not yet.' })
        );
        const env = bindEnv(Envapter, new PortableSource({ DISCORD_CLIENT_SECRET: 'client-secret' }));
        onTestFinished(() => {
            env[Symbol.dispose]();
        });
        linkedRoles.init();
        return { linkedRoles, requests: discord.requests };
    }

    function bodiesSent(requests: SeenRequest[], method: string, route: string): unknown[] {
        return requests
            .filter((request) => request.method === method && request.route === route)
            .map((request) => JSON.parse(request.body) as unknown);
    }

    afterEach(() => {
        vi.useRealTimers();
    });

    it('registers the records and sets the verification URL on the first start', async () => {
        const { linkedRoles, requests } = await botWith();

        await linkedRoles.ready();

        expect(bodiesSent(requests, 'PUT', RECORDS_ROUTE)).toEqual([
            [{ key: 'level', type: level.type, name: 'Level', description: 'Your level' }]
        ]);
        expect(bodiesSent(requests, 'PATCH', '/applications/@me')).toEqual([
            { role_connections_verification_url: 'https://bot.test/linked-roles/verify' }
        ]);
    });

    it("doesn't call Discord on the next start when nothing changed", async () => {
        const { linkedRoles, requests } = await botWith();
        await linkedRoles.ready();
        const afterFirst = requests.length;

        await linkedRoles.ready();

        expect(requests).toHaveLength(afterFirst);
    });

    it('registers the records again after one changed', async () => {
        const kv = new MapDriver();
        const before = await botWith({ host: { kv } });
        await before.linkedRoles.ready();

        const after = await botWith({ host: { kv }, records: { level: { ...level, name: 'Rank' } } });
        await after.linkedRoles.ready();

        expect(bodiesSent(after.requests, 'PUT', RECORDS_ROUTE)).toEqual([[expect.objectContaining({ name: 'Rank' })]]);
    });

    it('syncs again a day later, in case someone changed the application since', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        const { linkedRoles, requests } = await botWith();
        await linkedRoles.ready();

        vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);
        await linkedRoles.ready();

        expect(bodiesSent(requests, 'PUT', RECORDS_ROUTE)).toHaveLength(2);
    });

    it('logs the callback address while the application lacks it, and checks again on the next start', async () => {
        using logs = captureLogs();
        const { linkedRoles, requests } = await botWith({ redirects: ['https://other.test/callback'] });

        await linkedRoles.ready();
        await linkedRoles.ready();

        expect(logs.at('warn')).toEqual([expect.stringContaining(CALLBACK), expect.stringContaining(CALLBACK)]);
        expect(bodiesSent(requests, 'PUT', RECORDS_ROUTE)).toHaveLength(2);
    });

    it('logs and lets startup go on when Discord refuses', async () => {
        using logs = captureLogs();
        const { linkedRoles } = await botWith({
            answer: () => ({ status: 403, json: { message: 'Missing Access', code: 50_001 } })
        });

        await expect(linkedRoles.ready()).resolves.toBeUndefined();
        expect(logs.at('error')).toHaveLength(1);
    });

    it("builds the verification link under the path in the bot's url", async () => {
        const { linkedRoles } = await botWith({ host: { url: 'https://example.test/bot' } });

        expect(linkedRoles.verifyUrl()).toBe('https://example.test/bot/linked-roles/verify');
    });
});
