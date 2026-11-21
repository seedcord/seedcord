import { MemoryDriver } from '@seedcord/core';
import { currentApplication } from '@seedcord/core/internal';
import { Plugin } from '@seedcord/core/plugin';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Converters, Envapter } from 'envapt';
import { memoize } from 'es-toolkit';

import { OAuthClient } from './OAuthClient';

import type { LoginLink } from './AuthorizeUrlOptions';
import type { CompletedLogin, FailedLogin, LoginOutcome } from './LoginOutcome';
import type { OAuthScope, UserCalls } from './UserCalls';
import type { CoreBase } from '@seedcord/core';
import type { Promisable, Simplify } from 'type-fest';

/**
 * What {@link OAuth.with} takes.
 *
 * @typeParam TScopes - The `scopes` you pass.
 * @typeParam TExtra - The `extraScopes` you pass.
 */
export interface OAuthOptions<TScopes extends OAuthScope = never, TExtra extends OAuthScope = never> {
    /** The scopes to request on every login. `identify` is always added. */
    scopes?: readonly TScopes[] | undefined;
    /**
     * Scopes that only some of your features need. A login requests one only when its link lists it, and
     * the typed calls for it resolve to `undefined` for a user who hasn't granted it yet.
     */
    extraScopes?: readonly TExtra[] | undefined;
    /**
     * Runs after a login. The user's tokens are saved by then. Set your own session here and return what
     * the visitor's browser gets, usually a redirect. Without it, the visitor gets a plain page that says
     * the login worked.
     */
    onLogin?: ((login: Simplify<CompletedLogin>, request: Request) => Promisable<Response>) | undefined;
    /** Runs when a login didn't finish. Without it, the visitor gets a plain page that says so. */
    onFailure?: ((failure: Simplify<FailedLogin>, request: Request) => Promisable<Response>) | undefined;
}

const BAD_REQUEST = 400;
const CLIENT_SECRET_KEY = 'DISCORD_CLIENT_SECRET';
// the redirect can get removed in the portal later, and then we want the warning back. once a day is a guess
const RECHECK_REDIRECT_MS = 24 * 60 * 60 * 1000;

const FAILURE_PAGES = {
    denied: 'The login was cancelled. You can close this tab.',
    invalid: 'This login link expired. Go back and start again.'
} satisfies Record<FailedLogin['kind'], string>;

/**
 * Logs people in with Discord and calls the API as them. Attach what {@link OAuth.with} returns.
 *
 * It serves `oauth/login` and `oauth/callback` under your bot's `server.url`. Add the callback's address
 * under Redirects on your application's OAuth2 page. The plugin logs the exact address at startup when it
 * isn't there yet.
 *
 * It reads the client secret from `DISCORD_CLIENT_SECRET`, and it needs `kv` in your bot's config to be a
 * driver that saves somewhere since each user's tokens are kept there.
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

    // built on first use because a gateway bot doesn't have its application id in init() yet. it logs in
    // after that.
    // don't swap this for once(). if the first call throws, once() still counts it as done and every
    // call after that returns undefined
    readonly #client = memoize(
        () =>
            new OAuthClient({
                rest: this.core.rest,
                store: this.kv.collection<string>('tokens'),
                clientId: this.core.applicationId,
                clientSecret: this.#clientSecret(),
                baseUrl: this.core.url,
                scopes: this.options.scopes,
                extraScopes: this.options.extraScopes
            })
    );

    /**
     * Returns the plugin class to attach, with your options in it. `OAuth` itself doesn't attach because
     * a plain `attach('oauth', OAuth, options)` loses your scopes in the types.
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
        // the logger prints `constructor.name`. bun sets it to '' for `{ OAuth: class {} }.OAuth`, and the build
        // turns a class in an object property into exactly that
        Object.defineProperty(Attached, 'name', { value: 'OAuth' });
        return Attached;
    }

    /**
     * @throws A **SeedcordError** when `server.url` or `DISCORD_CLIENT_SECRET` isn't set.
     * @throws A **SeedcordError** when the bot's `kv` is the default one in memory.
     */
    public init(): void {
        // read here only to fail at startup when one is missing. otherwise the first visitor finds out
        void this.core.url;
        void this.#clientSecret();
        if (this.kv.driver instanceof MemoryDriver) {
            throw new SeedcordError(SeedcordErrorCode.PluginOAuthTokensInMemory, [this.constructor.name]);
        }
    }

    public override async ready(): Promise<void> {
        const callback = this.#client().redirectUri;
        // an edge bot runs ready() every time an isolate starts. saving the confirmed address in kv means
        // we only call discord for it once a day
        const confirmed = this.kv.collection<string>('portal');
        if ((await confirmed.get('redirect')) === callback) return;

        try {
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

    /** Deletes a user's saved tokens. It doesn't call Discord, and the user's grant there keeps working. */
    public async forget(userId: string): Promise<void> {
        await this.#client().forget(userId);
    }

    /**
     * Revokes a user's grant on Discord and deletes their saved tokens. Discord ends every grant that the
     * user gave your application, including the tokens another plugin saved for them.
     */
    public async revoke(userId: string): Promise<void> {
        await this.#client().revoke(userId);
    }

    /**
     * The address that starts a login. Send a browser there, or put it in a message.
     *
     * @example
     * ```ts
     * // asks for one more scope, and comes back to the page that needed it
     * bot.oauth.loginUrl({ scopes: ['connections'], returnTo: '/dashboard/accounts' });
     * ```
     */
    public loginUrl(link?: LoginLink<TScopes, TExtra>): string {
        return this.#client().loginUrl(link);
    }

    async #respond(outcome: LoginOutcome, request: Request): Promise<Response> {
        const { onLogin, onFailure } = this.options;
        if (outcome.kind !== 'login') {
            return onFailure?.(outcome, request) ?? new Response(FAILURE_PAGES[outcome.kind], { status: BAD_REQUEST });
        }
        return onLogin?.(outcome.login, request) ?? new Response('You are logged in. You can close this tab.');
    }

    // a method because the secret can't be read in the constructor. on workers envapt throws if you read
    // before the bot binds its env, and plugins get built before that
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
