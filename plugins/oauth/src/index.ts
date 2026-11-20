export { OAuthClient } from './OAuthClient';

export type {
    AuthorizeUrlOptions,
    OAuthClientOptions,
    OAuthLogin,
    OAuthScope,
    UserCalls,
    UserRest
} from './OAuthClient';
export type { TokenStore } from './TokenVault';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
