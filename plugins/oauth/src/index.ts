export { OAuthClient } from './OAuthClient';

export type { AuthorizeUrlOptions, OAuthClientOptions, OAuthLogin } from './OAuthClient';
export type { TokenStore } from './TokenVault';
export type { GuildJoin, GuildJoinOptions, OAuthScope, UserCalls, UserRest } from './UserCalls';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
