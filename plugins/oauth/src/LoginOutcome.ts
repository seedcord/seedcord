import type { OAuthScope } from './UserCalls';
import type { APIGuild, APIUser, APIWebhook } from 'discord-api-types/v10';

/** What `exchange()` resolves to: who logged in, and what Discord gave back with the tokens. */
export interface OAuthLogin {
    user: APIUser;
    /** The scopes Discord granted. It includes scopes that the user approved in an earlier login. */
    scopes: OAuthScope[];
    /** The server that the bot was added to when the login had the `bot` scope. */
    guild: APIGuild | undefined;
    /**
     * The permissions of the bot's own role in `guild` after the login. The visitor can untick permissions
     * on Discord's screen, so check this before you rely on one.
     */
    permissions: bigint | undefined;
    /** The webhook that Discord created when the login had the `webhook.incoming` scope. */
    webhook: APIWebhook | undefined;
}

/** A login that finished on the callback route. */
export interface CompletedLogin extends OAuthLogin {
    /** The path that the login link asked to end on, from `loginUrl({ returnTo })`. It always starts with one `/`. */
    returnTo: string | undefined;
}

/**
 * A login that didn't finish.
 *
 * - `denied`: the visitor pressed cancel on Discord's consent screen, or Discord refused the request.
 *   `error` is Discord's reason, like `access_denied`.
 * - `invalid`: the login link expired, the page was reloaded, or the visit didn't come from a login that
 *   this browser started.
 * - `unlisted`: the login link requested `scopes` that aren't in the client's `extraScopes`. The visitor
 *   never reached Discord.
 * - `failed`: trading the code for the user's tokens threw. Discord was down, it refused the client
 *   secret, or the store didn't take the tokens. `error` is what was thrown.
 */
export type FailedLogin =
    | { kind: 'denied'; error: string }
    | { kind: 'invalid' }
    | { kind: 'unlisted'; scopes: string[] }
    | { kind: 'failed'; error: unknown };

/** How a visit to the login route or the callback route ended. */
export type LoginOutcome = { kind: 'login'; login: CompletedLogin } | FailedLogin;
