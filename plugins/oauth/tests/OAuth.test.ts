import { MemoryDriver } from '@seedcord/core';
import { bindEnv } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vite-plus/test';

import { OAuth } from '#src/OAuth';

import { fakeDiscord } from './fakeDiscord';
import { SERVER_URL_UNSET, TestHost } from './host';

import type { CompletedLogin, FailedLogin } from '#src/LoginOutcome';
import type { OAuthOptions } from '#src/OAuth';
import type { SeenRequest } from './fakeDiscord';

const USER = { id: '111', username: 'dhruv' };
const CALLBACK = 'https://bot.test/oauth/callback';

interface Bot {
    oauth: OAuth;
    requests: SeenRequest[];
}

async function botWith(
    options: OAuthOptions = {},
    {
        redirects = [CALLBACK],
        host = {}
    }: { redirects?: string[]; host?: Partial<ConstructorParameters<typeof TestHost>[0]> } = {}
): Promise<Bot> {
    const discord = await fakeDiscord(({ route }) => {
        if (route === '/oauth2/token') {
            return {
                json: {
                    token_type: 'Bearer',
                    access_token: 'a',
                    refresh_token: 'r',
                    expires_in: 604_800,
                    scope: 'identify'
                }
            };
        }
        if (route === '/applications/@me') return { json: { redirect_uris: redirects } };
        if (route === '/oauth2/@me') return { json: { user: USER, scopes: ['identify'] } };
        return { json: USER };
    });
    const { oauth } = new TestHost({ api: discord.api, ...host }).attach('oauth', OAuth.with(options));
    bindSecretForThisTest();
    oauth.init();
    return { oauth, requests: discord.requests };
}

// bound until the test ends because the plugin reads the secret in init() and again on the first request
function bindSecretForThisTest(): void {
    const env = bindEnv(Envapter, new PortableSource({ DISCORD_CLIENT_SECRET: 'client-secret' }));
    onTestFinished(() => {
        env[Symbol.dispose]();
    });
}

async function logIn(oauth: OAuth, loginUrl = oauth.loginUrl()): Promise<Response> {
    const redirect = await oauth.fetch(new Request(loginUrl));
    const [cookie = ''] = (redirect?.headers.get('set-cookie') ?? '').split('; ');
    const state = new URL(redirect?.headers.get('location') ?? '').searchParams.get('state') ?? '';
    const callback = `${CALLBACK}?${new URLSearchParams({ code: 'the-code', state, iss: 'https://discord.com' }).toString()}`;
    const response = await oauth.fetch(new Request(callback, { headers: { cookie } }));
    if (!response) throw new Error('the callback route passed the request on');
    return response;
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('OAuth startup', () => {
    async function initError(
        host: Partial<ConstructorParameters<typeof TestHost>[0]>,
        secret?: string
    ): Promise<unknown> {
        const discord = await fakeDiscord(() => ({}));
        const { oauth } = new TestHost({ api: discord.api, ...host }).attach('oauth', OAuth.with());
        using _env = bindEnv(
            Envapter,
            new PortableSource(secret === undefined ? {} : { DISCORD_CLIENT_SECRET: secret })
        );
        try {
            oauth.init();
            return undefined;
        } catch (error) {
            return error;
        }
    }

    it("stops when the bot doesn't set server.url", async () => {
        expect(await initError({ url: SERVER_URL_UNSET }, 's')).toMatchObject({
            code: SeedcordErrorCode.CoreServerUrlUnset
        });
    });

    it('stops when DISCORD_CLIENT_SECRET is unset', async () => {
        const error = await initError({});

        expect(error).toMatchObject({ code: SeedcordErrorCode.ConfigMissingEnv });
        expect(String(error)).toContain('DISCORD_CLIENT_SECRET');
    });

    it('stops when kv is the default in-memory driver', async () => {
        expect(await initError({ kv: new MemoryDriver() }, 's')).toMatchObject({
            code: SeedcordErrorCode.PluginOAuthTokensInMemory
        });
    });

    it('starts with all three in place', async () => {
        expect(await initError({}, 's')).toBeUndefined();
    });

    it('attaches as a class called OAuth, the name that the logger shows', () => {
        expect(OAuth.with().name).toBe('OAuth');
    });

    it('still works after a call that came before the bot knew its application id', async () => {
        const discord = await fakeDiscord(() => ({}));
        const host = new TestHost({ api: discord.api });
        const { oauth } = host.attach('oauth', OAuth.with());
        bindSecretForThisTest();
        host.loggedIn = false;

        expect(() => oauth.loginUrl()).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreApplicationUnavailable })
        );
        host.loggedIn = true;

        expect(oauth.loginUrl()).toBe('https://bot.test/oauth/login');
    });
});

describe('OAuth routes', () => {
    it('logs a visitor in, shows a plain page, and then calls Discord as them', async () => {
        const { oauth, requests } = await botWith();

        const page = await logIn(oauth);

        expect(page.status).toBe(200);
        expect(await page.text()).toContain('logged in');
        expect(await oauth.as(USER.id).user()).toEqual(USER);
        expect(requests.at(-1)?.headers.authorization).toBe('Bearer a');
        expect(await oauth.scopesOf(USER.id)).toEqual(['identify']);
    });

    it('hands the login and the request to onLogin and answers with what it returns', async () => {
        const seen: { login?: CompletedLogin; url?: string } = {};
        const { oauth } = await botWith({
            onLogin: (login, request) => {
                Object.assign(seen, { login, url: request.url });
                return Response.redirect('https://dash.test/home');
            }
        });

        const response = await logIn(oauth, oauth.loginUrl({ returnTo: '/servers' }));

        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe('https://dash.test/home');
        expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
        expect(seen.login).toMatchObject({ user: USER, scopes: ['identify'], returnTo: '/servers' });
        expect(seen.url).toContain('/oauth/callback?code=the-code');
    });

    it('shows a plain page with a 400 for a login that did not finish', async () => {
        const { oauth } = await botWith();

        const response = await oauth.fetch(new Request(`${CALLBACK}?code=c&state=s&iss=https://discord.com`));

        expect(response?.status).toBe(400);
        expect(await response?.text()).toContain('expired');
    });

    it('hands a login that did not finish to onFailure', async () => {
        const failures: FailedLogin[] = [];
        const { oauth } = await botWith({
            onFailure: (failure) => {
                failures.push(failure);
                return new Response('try again', { status: 418 });
            }
        });

        const response = await oauth.fetch(new Request(`${CALLBACK}?code=c&state=s&iss=https://discord.com`));

        expect(failures).toEqual([{ kind: 'invalid' }]);
        expect(response?.status).toBe(418);
    });

    it('passes on a request for another path', async () => {
        const { oauth } = await botWith();

        expect(await oauth.fetch(new Request('https://bot.test/interactions', { method: 'POST' }))).toBeUndefined();
        expect(await oauth.fetch(new Request('https://bot.test/health'))).toBeUndefined();
    });

    it("builds its login link under the path in the bot's url", async () => {
        const { oauth } = await botWith({}, { host: { url: 'https://example.com/bot/' } });

        expect(oauth.loginUrl({ returnTo: '/servers' })).toBe(
            'https://example.com/bot/oauth/login?returnTo=%2Fservers'
        );
    });
});

describe('OAuth redirect check', () => {
    function redirectChecks(requests: SeenRequest[]): number {
        return requests.filter((request) => request.route === '/applications/@me').length;
    }

    it('logs the callback address when the application does not list it, and lets startup go on', async () => {
        const warn = vi.spyOn(Logger.prototype, 'warn').mockReturnValue();
        const { oauth } = await botWith({}, { redirects: ['https://other.test/callback'] });

        await oauth.ready();

        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0]?.[0]).toContain(CALLBACK);
    });

    it('checks again on the next start until the address is listed', async () => {
        vi.spyOn(Logger.prototype, 'warn').mockReturnValue();
        const { oauth, requests } = await botWith({}, { redirects: [] });

        await oauth.ready();
        await oauth.ready();

        expect(redirectChecks(requests)).toBe(2);
    });

    it("doesn't log or check with Discord again once the address is listed", async () => {
        const warn = vi.spyOn(Logger.prototype, 'warn').mockReturnValue();
        const { oauth, requests } = await botWith();

        await oauth.ready();
        await oauth.ready();

        expect(warn).not.toHaveBeenCalled();
        expect(redirectChecks(requests)).toBe(1);
    });

    it('checks with Discord again a day later, in case the address was removed since', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        const { oauth, requests } = await botWith();
        await oauth.ready();

        vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);
        await oauth.ready();

        expect(redirectChecks(requests)).toBe(2);
    });

    it('logs and lets startup go on when Discord refuses the check', async () => {
        const warn = vi.spyOn(Logger.prototype, 'warn').mockReturnValue();
        const discord = await fakeDiscord(() => ({ status: 403, json: { message: 'Missing Access', code: 50_001 } }));
        const { oauth } = new TestHost({ api: discord.api }).attach('oauth', OAuth.with());
        bindSecretForThisTest();
        oauth.init();

        await expect(oauth.ready()).resolves.toBeUndefined();
        expect(warn).toHaveBeenCalledOnce();
    });
});
