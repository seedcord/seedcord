import { MemoryDriver } from '@seedcord/core';
import { currentApplication, keepRequestOpenFor } from '@seedcord/core/internal';
import { Plugin } from '@seedcord/core/plugin';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { Converters, Envapter } from 'envapt';

import { OAuthClient } from './OAuthClient';

import type { LoginLink } from './AuthorizeUrlOptions';
import type { CompletedLogin, FailedLogin, LoginOutcome } from './LoginOutcome';
import type { OAuthClientOptions } from './OAuthClientOptions';
import type { OAuthScope, UserCalls } from './UserCalls';
import type { CoreBase } from '@seedcord/core';
import type { Promisable, Simplify } from 'type-fest';

/**
 * What {@link OAuth.with} takes.
 *
 * @typeParam TScopes - The `scopes` you pass.
 * @typeParam TExtra - The `extraScopes` you pass.
 */
export interface OAuthOptions<TScopes extends OAuthScope = never, TExtra extends OAuthScope = never> extends Pick<
    OAuthClientOptions<TScopes, TExtra>,
    'scopes' | 'extraScopes'
> {
    /**
     * Runs after the plugin saves the user's tokens. Return the visitor's response, usually a redirect
     * that sets your session. Without it, the visitor gets a plain page that says the login worked.
     */
    onLogin?: ((login: Simplify<CompletedLogin>, request: Request) => Promisable<Response>) | undefined;
    /**
     * Runs when a login didn't finish, for every `kind` of {@link FailedLogin}. Without it, the visitor
     * gets a plain page that says so. The plugin logs a `failed` login's error before it calls this.
     */
    onFailure?: ((failure: Simplify<FailedLogin>, request: Request) => Promisable<Response>) | undefined;
}

const BAD_REQUEST = 400;
const SERVER_ERROR = 500;
const CLIENT_SECRET_KEY = 'DISCORD_CLIENT_SECRET';
// someone can remove the redirect in the portal later, and the warning should come back then
const RECHECK_REDIRECT_MS = 24 * 60 * 60 * 1000;

const FAILURE_PAGES = {
    denied: { status: BAD_REQUEST, text: 'The login was cancelled. You can close this tab.' },
    invalid: { status: BAD_REQUEST, text: "This login didn't finish. Go back and start again." },
    unlisted: { status: BAD_REQUEST, text: "This login link requests a scope that this bot doesn't allow." },
    failed: {
        status: SERVER_ERROR,
        text: "The login couldn't finish because of a problem on our side. Try again in a bit."
    }
} satisfies Record<FailedLogin['kind'], { status: number; text: string }>;

/**
 * Logs people in with Discord and calls the API as them. Attach what {@link OAuth.with} returns.
 *
 * It serves `oauth/login` and `oauth/callback` under your bot's `server.url`. Add the callback's address
 * under Redirects on your application's OAuth2 page. The plugin logs the exact address at startup when it
 * isn't there yet.
 *
 * It reads the client secret from `DISCORD_CLIENT_SECRET`. It saves each user's tokens in your bot's `kv`,
 * so `kv` needs a driver that saves to a file or a database.
 *
 * @typeParam TScopes - The `scopes` from the options. Leave it out.
 * @typeParam TExtra - The `extraScopes` from the options. Leave it out.
 * @example
 * ```ts
 * new Seedcord(config).attach(
 *     'oauth',
 *     OAuth.with({
 *         scopes: ['guilds'],
 *         onLogin: ({ user, returnTo }) =>
 *             new Response(null, {
 *                 status: 302,
 *                 headers: {
 *                     location: returnTo ?? '/dashboard',
 *                     'set-cookie': sessions.create(user.id)
 *                 }
 *             })
 *     })
 * );
 *
 * // in a handler or your own routes
 * const guilds = await this.core.oauth.as(userId).guilds();
 * ```
 */
export abstract class OAuth<TScopes extends OAuthScope = never, TExtra extends OAuthScope = never> extends Plugin {
    protected abstract readonly options: OAuthOptions<TScopes, TExtra>;

    #built?: OAuthClient<TScopes, TExtra> | undefined;

    /**
     * Returns the plugin class to attach, with your options in it. Attaching `OAuth` directly
     * doesn't compile, because it's abstract.
     *
     * @example
     * ```ts
     * seedcord.attach('oauth', OAuth.with({ scopes: ['guilds'], extraScopes: ['connections'] }));
     * ```
     */
    public static with<TScopes extends OAuthScope = never, TExtra extends OAuthScope = never>(
        options: OAuthOptions<TScopes, TExtra> = {}
    ): new (host: CoreBase) => OAuth<TScopes, TExtra> {
        const Attached = class extends OAuth<TScopes, TExtra> {
            protected readonly options = options;
        };
        // the logger prints `constructor.name`
        Object.defineProperty(Attached, 'name', { value: 'OAuth' });
        return Attached;
    }

    /**
     * @throws A **SeedcordError** when `server.url` or `DISCORD_CLIENT_SECRET` isn't set.
     * @throws A **SeedcordTypeError** when the bot's `kv` keeps everything in memory.
     */
    public init(): void {
        // read here only to fail at startup when one is missing. otherwise the first visitor finds out
        void this.core.url;
        void this.#clientSecret();
        if (this.kv.driver instanceof MemoryDriver) {
            throw new SeedcordTypeError(SeedcordErrorCode.PluginOAuthTokensInMemory, [this.constructor.name]);
        }
    }

    public override async ready(): Promise<void> {
        // an edge bot runs ready() every time an isolate starts. with the confirmed address in kv, discord
        // gets asked once a day
        const confirmed = this.kv.collection<string>('portal');
        try {
            const callback = this.#client().redirectUri;
            if ((await confirmed.get('redirect')) === callback) return;

            const application = await currentApplication(this.core.rest);
            if (application.redirect_uris?.includes(callback)) {
                await confirmed.set('redirect', callback, RECHECK_REDIRECT_MS);
                return;
            }
            this.logger.utils.block(
                'Discord will refuse logins until this address is under Redirects on your OAuth2 page',
                [paint.sky(callback)],
                'warn'
            );
        } catch (error) {
            // only a warning. on edge a throw here would fail every interaction
            this.logger.warn(`Couldn't check the application's redirects: ${String(error)}`);
        }
    }

    public override fetch(request: Request): Promise<Response | undefined> {
        return this.#client().fetch(request, async (outcome) => this.#respond(outcome, request));
    }

    /** Calls Discord as a user who logged in. See {@link UserCalls}. */
    public as(userId: string): UserCalls<TScopes, TExtra> {
        return this.#client().as(userId);
    }

    /** The scopes that a user granted, or `undefined` for a user without saved tokens. It doesn't call Discord. */
    public async scopesOf(userId: string): Promise<OAuthScope[] | undefined> {
        return this.#client().scopesOf(userId);
    }

    /**
     * Deletes a user's saved tokens. It doesn't call Discord, and the user's grant there keeps working.
     *
     * When several processes or Workers isolates share one `kv`, a refresh that's running in another one
     * can save the tokens back. Call {@link OAuth.revoke} when the login has to end for certain.
     */
    public async forget(userId: string): Promise<void> {
        await this.#client().forget(userId);
    }

    /**
     * Revokes a user's grant on Discord and deletes their saved tokens.
     *
     * Discord ends every grant that the user gave your application, so tokens that another `OAuthClient`
     * saved for them stop working too. Use {@link OAuth.forget} to log someone out of one place.
     */
    public async revoke(userId: string): Promise<void> {
        await this.#client().revoke(userId);
    }

    /**
     * The address of the login route. Send a browser there, or put it in a message.
     *
     * @example
     * ```ts
     * // requests one more scope, and ends on the page that needed it
     * this.core.oauth.loginUrl({ scopes: ['connections'], returnTo: '/dashboard/accounts' });
     * ```
     */
    public loginUrl(link?: LoginLink<TScopes, TExtra>): string {
        return this.#client().loginUrl(link);
    }

    // built on first use since a gateway bot only has its application id after it logs in
    #client(): OAuthClient<TScopes, TExtra> {
        this.#built ??= new OAuthClient({
            rest: this.core.rest,
            store: this.kv.collection<string>('tokens'),
            clientId: this.core.applicationId,
            clientSecret: this.#clientSecret(),
            baseUrl: this.core.url,
            scopes: this.options.scopes,
            extraScopes: this.options.extraScopes,
            keepOpen: keepRequestOpenFor
        });
        return this.#built;
    }

    async #respond(outcome: LoginOutcome, request: Request): Promise<Response> {
        const { onLogin, onFailure } = this.options;
        if (outcome.kind === 'failed') this.logger.error("Couldn't finish a login", outcome.error);
        if (outcome.kind !== 'login') {
            const { status, text } = FAILURE_PAGES[outcome.kind];
            return onFailure?.(outcome, request) ?? new Response(text, { status });
        }
        return onLogin?.(outcome.login, request) ?? new Response('You are logged in. You can close this tab.');
    }

    // envapt throws on workers if you read before the bot binds its env, and plugins get built before that
    #clientSecret(): string {
        if (!Envapter.has(CLIENT_SECRET_KEY)) {
            throw new SeedcordError(SeedcordErrorCode.ConfigMissingEnv, [
                CLIENT_SECRET_KEY,
                "It's the client secret on your application's OAuth2 page in the Developer Portal."
            ]);
        }
        return Envapter.getRequired(CLIENT_SECRET_KEY, Converters.String);
    }
}
