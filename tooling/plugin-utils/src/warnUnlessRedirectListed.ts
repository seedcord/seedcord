import { paint } from '@seedcord/errors';

import type { KvCollection } from '@seedcord/core';
import type { Logger } from '@seedcord/logger';

// we check once a day in case someone has removed the redirect from the portal
const RECHECK_REDIRECT_MS = 24 * 60 * 60 * 1000;

// the two members of plugin-oauth's OAuthClient that this reads. importing the class would make
// plugin-oauth depend on a package that depends on it
interface RedirectingClient {
    readonly redirectUri: string;
    isRedirectListed(): Promise<boolean>;
}

// an edge bot runs ready() every time an isolate starts. with the confirmed address in `confirmed`,
// discord gets asked once a day
export async function warnUnlessRedirectListed(
    client: RedirectingClient,
    confirmed: KvCollection<string>,
    logger: Logger,
    warning: string
): Promise<void> {
    const callback = client.redirectUri;
    if ((await confirmed.get('redirect')) === callback) return;

    if (await client.isRedirectListed()) {
        await confirmed.set('redirect', callback, RECHECK_REDIRECT_MS);
        return;
    }
    logger.utils.block(warning, [paint.sky(callback)], 'warn');
}
