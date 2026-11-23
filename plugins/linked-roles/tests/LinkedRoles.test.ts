import { MemoryDriver } from '@seedcord/core';
import { bindEnv } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { captureLogs } from '@seedcord/logger/internal';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vite-plus/test';

import { LinkedRoles, RecordType } from '#src/index';

import { fakeDiscord } from './fakeDiscord';
import { APP_ID, MapDriver, SERVER_URL_UNSET, TestHost } from './host';

import type { LinkedRoleRecords, LinkedRolesOptions, LinkedRolesResult } from '#src/index';
import type { SeenRequest } from './fakeDiscord';

const level = { type: RecordType.IntegerGreaterThanOrEqual, name: 'Level', description: 'Your level' } as const;

const CALLBACK = 'https://bot.test/linked-roles/callback';
const CONNECTION_ROUTE = `/users/@me/applications/${APP_ID}/role-connection`;
const USER = { id: '111', username: 'dhruv' };
const GRANTED = ['identify', 'role_connections.write', 'connections'];
const WEEK_SECONDS = 7 * 24 * 60 * 60;

type Options = LinkedRolesOptions<LinkedRoleRecords, 'connections', boolean>;

interface Bot {
    linkedRoles: LinkedRoles<LinkedRoleRecords, 'connections', boolean>;
    requests: SeenRequest[];
}

// answers like discord does for one user who approves everything
function discordListing(redirects: string[]): Parameters<typeof fakeDiscord>[0] {
    return ({ route }) => {
        if (route === '/oauth2/token') {
            return {
                json: {
                    token_type: 'Bearer',
                    access_token: 'user-token',
                    refresh_token: 'r',
                    expires_in: WEEK_SECONDS,
                    scope: GRANTED.join(' ')
                }
            };
        }
        if (route === '/oauth2/@me') return { json: { user: USER, scopes: GRANTED } };
        if (route === '/applications/@me') return { json: { redirect_uris: redirects } };
        if (route === '/users/@me/connections') return { json: [{ type: 'github', name: 'dhruv', verified: true }] };
        if (route === '/users/@me') return { json: USER };
        return { json: {} };
    };
}

async function botWith({
    options = {},
    redirects = [CALLBACK],
    answer = discordListing(redirects),
    host = {}
}: {
    options?: Partial<Options>;
    redirects?: string[];
    answer?: Parameters<typeof fakeDiscord>[0];
    host?: Partial<ConstructorParameters<typeof TestHost>[0]>;
} = {}): Promise<Bot> {
    const discord = await fakeDiscord(answer);
    const { linkedRoles } = new TestHost({ api: discord.api, ...host }).attach(
        'linkedRoles',
        LinkedRoles.with({ records: { level }, values: () => ({ refuse: 'Not yet.' }), ...options })
    );
    const env = bindEnv(Envapter, new PortableSource({ DISCORD_CLIENT_SECRET: 'client-secret' }));
    onTestFinished(() => {
        env[Symbol.dispose]();
    });
    linkedRoles.init();
    return { linkedRoles, requests: discord.requests };
}

function sent(requests: SeenRequest[], method: string, route: string): SeenRequest[] {
    return requests.filter((request) => request.method === method && request.route === route);
}

function bodiesSent(requests: SeenRequest[], method: string, route: string): unknown[] {
    return sent(requests, method, route).map((request) => JSON.parse(request.body) as unknown);
}

// opens the verify link, then comes back from discord the way a browser does
async function visit(
    { linkedRoles }: Bot,
    fromDiscord: Record<string, string> = { code: 'the-code' }
): Promise<Response> {
    const redirect = await linkedRoles.fetch(new Request(linkedRoles.verifyUrl()));
    const [cookie = ''] = (redirect?.headers.get('set-cookie') ?? '').split('; ');
    const state = new URL(redirect?.headers.get('location') ?? '').searchParams.get('state') ?? '';
    const query = new URLSearchParams({ ...fromDiscord, state, iss: 'https://discord.com' }).toString();
    const response = await linkedRoles.fetch(new Request(`${CALLBACK}?${query}`, { headers: { cookie } }));
    if (!response) throw new Error('the callback route passed the request on');
    return response;
}

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
        const Attached = LinkedRoles.with({ records, keepTokens, values: () => ({ refuse: 'Not yet.' }) });
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
        expect(LinkedRoles.with({ records: { level }, values: () => ({ refuse: 'Not yet.' }) }).name).toBe(
            'LinkedRoles'
        );
    });
});

describe('LinkedRoles portal sync', () => {
    const RECORDS_ROUTE = `/applications/${APP_ID}/role-connections/metadata`;

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

        const after = await botWith({ host: { kv }, options: { records: { level: { ...level, name: 'Rank' } } } });
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

describe('LinkedRoles routes', () => {
    const connected = (): Options['values'] => () => ({ platformUsername: 'dhruv', metadata: { level: 12 } });

    it('sends a visitor of the verify link to Discord, asking for its scopes and yours', async () => {
        const { linkedRoles } = await botWith({ options: { scopes: ['connections'] } });

        const redirect = await linkedRoles.fetch(new Request(linkedRoles.verifyUrl()));

        const authorize = new URL(redirect?.headers.get('location') ?? '');
        expect(authorize.host).toBe('discord.com');
        expect(authorize.pathname).toMatch(/\/oauth2\/authorize$/u);
        expect(authorize.searchParams.get('scope')?.split(' ').toSorted()).toEqual(GRANTED.toSorted());
        expect(authorize.searchParams.get('redirect_uri')).toBe(CALLBACK);
    });

    it("writes what `values` returns with the user's token, and shows a plain page", async () => {
        const bot = await botWith({ options: { values: connected() } });

        const page = await visit(bot);

        const [write] = sent(bot.requests, 'PUT', CONNECTION_ROUTE);
        expect(JSON.parse(write?.body ?? '')).toEqual({ platform_username: 'dhruv', metadata: { level: '12' } });
        expect(write?.headers.authorization).toBe('Bearer user-token');
        expect(page.status).toBe(200);
        expect(await page.text()).toContain('connected');
    });

    it('hands `values` the user, and calls as them', async () => {
        const seen: unknown[] = [];
        const bot = await botWith({
            options: {
                scopes: ['connections'],
                values: async ({ user, asUser }) => {
                    seen.push(user, await asUser.connections());
                    return { refuse: 'Not yet.' };
                }
            }
        });

        await visit(bot);

        expect(seen).toEqual([USER, [{ type: 'github', name: 'dhruv', verified: true }]]);
        expect(sent(bot.requests, 'GET', '/users/@me/connections')[0]?.headers.authorization).toBe('Bearer user-token');
    });

    it("shows the message that `values` refuses with and doesn't write", async () => {
        const bot = await botWith({ options: { values: () => ({ refuse: 'Use the bot once, then try again.' }) } });

        const page = await visit(bot);

        expect(await page.text()).toBe('Use the bot once, then try again.');
        expect(sent(bot.requests, 'PUT', CONNECTION_ROUTE)).toEqual([]);
    });

    it.for<[what: string, values: Options['values']]>([
        [
            'throws',
            () => {
                throw new Error('the database is down');
            }
        ],
        ['returns a value that its record refuses', () => ({ metadata: { level: 1.5 } })]
    ])("logs, shows a plain 500, and doesn't write when `values` %s", async ([, values]) => {
        using logs = captureLogs();
        const bot = await botWith({ options: { values } });

        const page = await visit(bot);

        expect(page.status).toBe(500);
        expect(logs.at('error')).toHaveLength(1);
        expect(sent(bot.requests, 'PUT', CONNECTION_ROUTE)).toEqual([]);
    });

    it('shows a plain 400 to a visitor who pressed cancel on Discord', async () => {
        const bot = await botWith();

        const page = await visit(bot, { error: 'access_denied' });

        expect(page.status).toBe(400);
        expect(sent(bot.requests, 'POST', '/oauth2/token')).toEqual([]);
    });

    it('shows a plain 400 for a verify link that someone added scopes to', async () => {
        const { linkedRoles } = await botWith();

        const page = await linkedRoles.fetch(new Request(`${linkedRoles.verifyUrl()}?scopes=guilds`));

        expect(page?.status).toBe(400);
    });

    it('hands every result to `onResult` and answers with what it returns', async () => {
        const results: LinkedRolesResult[] = [];
        const onResult: Options['onResult'] = (result) => {
            results.push(result);
            return Response.redirect('https://bot.test/linked');
        };
        const connecting = await botWith({ options: { values: connected(), onResult } });
        const refusing = await botWith({ options: { onResult } });

        const pages = [
            await visit(connecting),
            await visit(refusing),
            await visit(refusing, { error: 'access_denied' })
        ];

        expect(results).toEqual([
            { kind: 'connected', user: USER },
            { kind: 'refused', user: USER, message: 'Not yet.' },
            { kind: 'denied', error: 'access_denied' }
        ]);
        expect(pages.map((page) => page.headers.get('location'))).toEqual(
            Array.from({ length: 3 }, () => 'https://bot.test/linked')
        );
    });

    it("doesn't save the user's tokens in `kv` without `keepTokens`", async () => {
        const kv = new MapDriver();
        const bot = await botWith({ options: { values: connected() }, host: { kv } });

        await visit(bot);

        expect([...kv.entries('')]).toEqual([]);
    });

    it('passes on a request for another path', async () => {
        const { linkedRoles } = await botWith();

        expect(await linkedRoles.fetch(new Request('https://bot.test/oauth/login'))).toBeUndefined();
    });
});

describe('LinkedRoles with `keepTokens`', () => {
    // a bot that restarted after the user connected, on the same kv
    async function restartedAfterConnecting(values: Options['values']): Promise<Bot> {
        const kv = new MapDriver();
        const before = await botWith({
            options: { keepTokens: true, values: () => ({ refuse: 'Not yet.' }) },
            host: { kv }
        });
        await visit(before);
        return botWith({ options: { keepTokens: true, values }, host: { kv } });
    }

    it('`push()` runs `values` again for a connected user and writes it with their saved token', async () => {
        const seen: unknown[] = [];
        const bot = await restartedAfterConnecting(({ user }) => {
            seen.push(user);
            return { metadata: { level: 30 } };
        });

        const result = await bot.linkedRoles.push(USER.id);

        expect(result).toEqual({ kind: 'connected', user: USER });
        expect(seen).toEqual([USER]);
        const [write] = sent(bot.requests, 'PUT', CONNECTION_ROUTE);
        expect(JSON.parse(write?.body ?? '')).toEqual({ metadata: { level: '30' } });
        expect(write?.headers.authorization).toBe('Bearer user-token');
    });

    it("`push()` doesn't write for a user that `values` refuses, and returns the message", async () => {
        const bot = await restartedAfterConnecting(() => ({ refuse: 'Your account was removed.' }));

        expect(await bot.linkedRoles.push(USER.id)).toEqual({
            kind: 'refused',
            user: USER,
            message: 'Your account was removed.'
        });
        expect(sent(bot.requests, 'PUT', CONNECTION_ROUTE)).toEqual([]);
    });

    it('`clear()` writes an empty connection with the saved token', async () => {
        const bot = await restartedAfterConnecting(() => ({ refuse: 'Not yet.' }));

        await bot.linkedRoles.clear(USER.id);

        const [write] = sent(bot.requests, 'PUT', CONNECTION_ROUTE);
        expect(JSON.parse(write?.body ?? '')).toEqual({});
        expect(write?.headers.authorization).toBe('Bearer user-token');
    });

    it.for(['push', 'clear'] as const)('`%s()` throws for a user who never connected', async (method) => {
        const { linkedRoles } = await botWith({ options: { keepTokens: true } });

        await expect(linkedRoles[method]('999')).rejects.toMatchObject({
            code: SeedcordErrorCode.PluginOAuthLoginNeeded
        });
    });

    it.for(['push', 'clear'] as const)("`%s()` throws when the plugin doesn't keep tokens", async (method) => {
        const bot = await botWith({ options: { values: () => ({ metadata: { level: 12 } }) } });
        await visit(bot);

        await expect(bot.linkedRoles[method](USER.id)).rejects.toMatchObject({
            code: SeedcordErrorCode.PluginLinkedRolesTokensNotKept
        });
    });
});
