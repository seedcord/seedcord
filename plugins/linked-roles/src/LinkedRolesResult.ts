import type { FailedLogin } from '@seedcord/plugin-oauth';
import type { APIUser } from 'discord-api-types/v10';
import type { ExcludeStrict } from 'type-fest';

/**
 * What running your `values` for one user ended in. `push()` resolves to it.
 *
 * - `connected`: the plugin wrote the user's role connection.
 * - `refused`: your `values` returned `{ refuse }`, and `message` is that text. The plugin didn't write
 *   anything.
 */
export type ConnectionResult =
    | { kind: 'connected'; user: APIUser }
    | { kind: 'refused'; user: APIUser; message: string };

/**
 * How a visit to the callback route ended. It's a {@link ConnectionResult}, or one of these:
 *
 * - `denied`: the visitor pressed cancel on Discord's consent screen, or Discord refused the request.
 *   `error` is Discord's reason, like `access_denied`.
 * - `invalid`: the link expired, the page was reloaded, or the visit didn't come from a link that this
 *   browser opened.
 * - `failed`: something threw, like the token exchange, your `values`, or the write to Discord. `error`
 *   is what was thrown.
 */
export type LinkedRolesResult = ConnectionResult | ExcludeStrict<FailedLogin, { kind: 'unlisted' }>;
