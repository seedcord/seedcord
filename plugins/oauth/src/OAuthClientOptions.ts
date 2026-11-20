import type { TokenStore } from './TokenVault';
import type { OAuthScope } from './UserCalls';
import type { REST } from '@discordjs/rest';

/** The paths of the two login routes under `baseUrl`. */
export interface OAuthRoutes {
    /** The route that sends a visitor to Discord. `'oauth/login'` when you leave it out. */
    login?: string | undefined;
    /**
     * The route that Discord sends the visitor back to. `'oauth/callback'` when you leave it out. Its
     * full address has to be under Redirects on the application's OAuth2 page.
     */
    callback?: string | undefined;
}

/**
 * What {@link OAuthClient} needs to talk to Discord and to keep each user's tokens.
 *
 * @typeParam TScopes - The `scopes` you pass.
 * @typeParam TExtra - The `extraScopes` you pass.
 */
export interface OAuthClientOptions<TScopes extends OAuthScope = never, TExtra extends OAuthScope = never> {
    /**
     * A `@discordjs/rest` client, like `bot.rest`. Every call is made through it and waits in its rate
     * limit queue. The bot's token isn't sent with them.
     */
    rest: REST;
    /** Where the tokens are kept, encrypted. In a seedcord bot, pass `bot.kv.collection<string>('oauth-tokens')`. */
    store: TokenStore;
    /** The application's id, like `bot.applicationId`. */
    clientId: string;
    /**
     * The client secret from the application's OAuth2 page. The client also derives the key that encrypts
     * the tokens from it. After you rotate it, every user has to log in again.
     */
    clientSecret: string;
    /**
     * The public address of your server, like `bot.url`. It can have a path, like
     * `https://example.com/bot`. The login routes are under it.
     */
    baseUrl: string | URL;
    /** Set these when your site already has its own paths for a Discord login. */
    routes?: OAuthRoutes | undefined;
    /** The scopes to request on every login. `identify` is always added. */
    scopes?: readonly TScopes[] | undefined;
    /**
     * Scopes that only some of your features need. A login requests one only when its link lists it, and
     * the typed calls for it resolve to `undefined` for a user who hasn't granted it yet.
     */
    extraScopes?: readonly TExtra[] | undefined;
}
