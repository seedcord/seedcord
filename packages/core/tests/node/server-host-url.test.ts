import { SeedcordErrorCode } from '@seedcord/errors';
import { HostDevUrl } from '@seedcord/types/internal';
import { setDevFiles } from '@seedcord/utils/internal';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup } from '#src/lifecycle/CoordinatedStartup';
import { TestServerHost } from '#tests/utils/TestServerHost';

import type { ServerConfig, ServerHostConfig } from '@seedcord/types';

class InteractionsHost extends TestServerHost {
    protected override answerInteractions(): Promise<Response> {
        return Promise.resolve(new Response());
    }
}

function hostWith(server: ServerConfig, Host = TestServerHost): TestServerHost {
    // justified: ServerHost reads only kv, errors, and server off the config
    return new Host(new CoordinatedShutdown(), new CoordinatedStartup(), { server } as ServerHostConfig);
}

describe('core.url on a server host', () => {
    afterEach(() => {
        TestServerHost.resetHost();
    });

    it('returns server.url with a slash at the end of its path', () => {
        const host = hostWith({ port: false, url: 'https://bot.example.com/app' });

        expect(new URL('callback', host.url).href).toBe('https://bot.example.com/app/callback');
    });

    it('takes a URL instance without changing it', () => {
        const url = new URL('https://bot.example.com/app');
        const host = hostWith({ port: false, url });

        expect([host.url.href, url.href]).toEqual(['https://bot.example.com/app/', 'https://bot.example.com/app']);
    });

    it.each([
        ['without server.url', undefined, SeedcordErrorCode.CoreServerUrlUnset],
        ['when server.url is not a URL', 'bot.example.com', SeedcordErrorCode.CoreServerUrlInvalid],
        [
            'when server.url has a host and a port without a scheme',
            'localhost:3000',
            SeedcordErrorCode.CoreServerUrlInvalid
        ]
    ])('throws %s', (_case, url, code) => {
        const host = hostWith({ port: false, ...(url !== undefined && { url }) });

        expect(() => host.url).toThrow(expect.objectContaining({ code }));
    });

    it('returns the URL that seedcord dev set unless the config has its own server.url', () => {
        const host = hostWith({ port: false }, InteractionsHost);
        host[HostDevUrl] = 'https://tunnel.example.com';
        const fromDev = host.url.href;

        host.config.server = { port: false, url: 'https://bot.example.com' };

        expect([fromDev, host.url.href]).toEqual(['https://tunnel.example.com/', 'https://bot.example.com/']);
    });

    it("returns its localhost address under seedcord dev, even with a tunnel URL when it doesn't take interactions", () => {
        using _dev = setDevFiles({ root: import.meta.dirname, listed: [], skippedFolders: [] });
        const host = hostWith({ port: 4321 });
        host[HostDevUrl] = 'https://tunnel.example.com';

        expect(host.url.href).toBe('http://localhost:4321/');
    });
});
