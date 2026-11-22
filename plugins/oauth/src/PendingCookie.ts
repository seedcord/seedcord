import { Buffer } from 'node:buffer';

import { isPlainObject } from '@seedcord/utils/internal';

export interface PendingLogin {
    verifier: string | undefined;
    returnTo: string | undefined;
}

const NAME = 'seedcord_oauth';
// how long a visitor has to get through discord's consent screen. 10 minutes is a guess
const LIFETIME_SECONDS = 10 * 60;
// the url's `state` ends up in the cookie's name, and a `;` or a `=` in it could add its own cookie
// attributes there
const SAFE_IN_A_NAME = /^[\w-]+$/u;

// returnTo comes from the url, and anyone can write a link. without this check a real login could end
// on someone else's site. '//evil.test' and '/\evil.test' both look like paths, but a browser reads them
// as another site. parsing against a fake origin catches those because the origin changes
function ownPath(returnTo: string): string | undefined {
    if (!returnTo.startsWith('/')) return undefined;
    const origin = 'https://own.invalid';
    return URL.parse(returnTo, origin)?.origin === origin ? returnTo : undefined;
}

// what the login route leaves in the visitor's browser for the callback. each login has its own cookie,
// under its `state` because a second tab's login would replace a shared one
export class PendingCookie {
    private readonly name: string;
    private readonly scope: string;

    constructor(callback: URL) {
        // only this exact host can set a `__Host-` cookie, and a browser takes one only over https with
        // Path=/. over http the path comes from the public url since that's the only one the browser has
        const https = callback.protocol === 'https:';
        this.name = https ? `__Host-${NAME}` : NAME;
        this.scope = https ? 'Path=/; Secure' : `Path=${new URL('.', callback).pathname}`;
    }

    public save(state: string, pending: PendingLogin): string {
        return this.header(state, Buffer.from(JSON.stringify(pending)).toString('base64url'), LIFETIME_SECONDS);
    }

    public clear(state: string): string {
        return this.header(state, '', 0);
    }

    // a visitor can edit the url's `state` and their own cookie. this is the one place that reads either
    public read(request: Request, state: string): PendingLogin | undefined {
        if (!SAFE_IN_A_NAME.test(state)) return undefined;
        const name = `${this.nameFor(state)}=`;
        const value = request.headers
            .get('cookie')
            ?.split('; ')
            .find((part) => part.startsWith(name))
            ?.slice(name.length);
        if (value === undefined) return undefined;

        let saved: unknown;
        try {
            saved = JSON.parse(Buffer.from(value, 'base64url').toString());
        } catch {
            return undefined;
        }
        if (!isPlainObject(saved)) return undefined;

        const { verifier, returnTo } = saved;
        if (verifier !== undefined && typeof verifier !== 'string') return undefined;
        return { verifier, returnTo: typeof returnTo === 'string' ? ownPath(returnTo) : undefined };
    }

    private nameFor(state: string): string {
        return `${this.name}_${state}`;
    }

    // HttpOnly so page scripts can't read it. it has to be Lax because Strict wouldn't send it when
    // discord redirects back
    private header(state: string, value: string, maxAge: number): string {
        return `${this.nameFor(state)}=${value}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; ${this.scope}`;
    }
}
