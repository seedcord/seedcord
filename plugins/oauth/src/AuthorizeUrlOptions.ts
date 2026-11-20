import type { OAuthScope } from './UserCalls';
import type { ApplicationIntegrationType } from 'discord-api-types/v10';
import type { Except, IsNever } from 'type-fest';

/** What a link can set when its scopes include `bot`, which adds the bot to a server during the login. */
export interface BotLinkOptions {
    /** The permissions to request for the bot as a bitfield. Without it, the bot joins with none. */
    permissions?: bigint | string | undefined;
    /** The server that Discord's picker starts on. */
    guildId?: string | undefined;
    /** With `guildId`, stops the visitor from picking another server. */
    disableGuildSelect?: boolean | undefined;
}

/** What a link can set when its scopes include `bot` or `applications.commands`. */
export interface InstallLinkOptions {
    /** Where the application installs: in a server, or on the visitor's own account. */
    integrationType?: ApplicationIntegrationType | undefined;
}

interface EveryLinkOptions<TExtra extends OAuthScope> {
    /** A random value that you tie to the visitor's browser and compare when Discord sends it back. */
    state: string;
    /**
     * The SHA-256 PKCE challenge, base64url encoded. Pass its verifier to `exchange()`. Discord refuses a
     * challenge together with the `role_connections.write` scope.
     */
    codeChallenge?: string | undefined;
    /** The `extraScopes` this link also requests. */
    scopes?: readonly TExtra[] | undefined;
}

// an option only exists with its scope because discord only documents it for that kind of link
type WithScope<TScopes extends OAuthScope, TWanted extends OAuthScope, TOptions> =
    IsNever<Extract<TScopes, TWanted>> extends true ? unknown : TOptions;

/**
 * What `authorizeUrl()` puts in the link, besides the client's `scopes`. The options for adding the bot
 * only exist when the client's lists include the scope they belong to.
 *
 * @typeParam TScopes - The client's `scopes`.
 * @typeParam TExtra - The client's `extraScopes`.
 */
export type AuthorizeUrlOptions<
    TScopes extends OAuthScope = never,
    TExtra extends OAuthScope = never
> = EveryLinkOptions<TExtra> &
    WithScope<TScopes | TExtra, 'bot', BotLinkOptions> &
    WithScope<TScopes | TExtra, 'bot' | 'applications.commands', InstallLinkOptions>;

/**
 * What `loginUrl()` puts in a login link.
 *
 * @typeParam TScopes - The client's `scopes`.
 * @typeParam TExtra - The client's `extraScopes`.
 */
export type LoginLink<TScopes extends OAuthScope = OAuthScope, TExtra extends OAuthScope = OAuthScope> = Except<
    AuthorizeUrlOptions<TScopes, TExtra>,
    'state' | 'codeChallenge'
> & {
    /**
     * Where the visitor should end up after the login. As a path on your own site like `'/dashboard'`.
     * The finished login has it as `returnTo`. Anything that points at another site is discarded.
     */
    returnTo?: string | undefined;
};
