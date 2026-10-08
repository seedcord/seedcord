import { InteractionKind, Subscribe, Subscriber } from '@seedcord/core';
import { storeInteractionRoute } from '@seedcord/core/internal';
import { Plugin } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { Seedcord } from '#src/edge/Seedcord';
import { BUILT_ROOT, clearBuiltFiles, registerBuiltFiles } from '#tests/helpers/builtFiles';
import { createSigner, signedRequest } from '#tests/helpers/ed25519';
import { APP_ID, VALID_TOKEN } from '#tests/helpers/fixtures';
import { capturingCtx, slashPayload } from '#tests/helpers/interactions';

import type { HttpEdgeConfig } from '#interfaces/Config';
import type { Signer } from '#tests/helpers/ed25519';
import type { CoreBase } from '@seedcord/core';

const ping = '{"type":1}';
// a type resolve() does not recognize. the engine still publishes anyInteraction for it
const unrouted = '{"type":99}';

class Late extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class ServerOnly extends Plugin<{ runtime: 'server' }> {
    constructor(host: CoreBase) {
        super(host, { runtime: 'server' });
    }
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

interface Folders {
    handlers?: string;
    subscribers?: string;
}

function config(folders: Folders = {}): HttpEdgeConfig {
    return {
        bot: { interactions: { path: folders.handlers ?? null }, commands: { path: null } },
        subscribers: { path: folders.subscribers ?? null }
    };
}

async function signedEnv(): Promise<Signer> {
    const signer = await createSigner();
    Envapter.useSource(new PortableSource({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN }));
    return signer;
}

describe('the edge Seedcord', () => {
    afterEach(() => {
        // @ts-expect-error singleton reset between tests
        Seedcord.reset();
        clearBuiltFiles();
    });

    it('runs a slash handler from the built files', async () => {
        const ran: string[] = [];
        class Ping extends SlashHandler<never> {
            public execute(): Promise<void> {
                ran.push('ping');
                return Promise.resolve();
            }
        }
        storeInteractionRoute(InteractionKind.Slash, 'ping', Ping);
        registerBuiltFiles({ '/handlers/Ping.ts': { Ping } });
        const signer = await signedEnv();
        const ctx = capturingCtx();

        const seedcord = new Seedcord(config({ handlers: `${BUILT_ROOT}/handlers` }));
        const response = await seedcord.fetch(
            await signedRequest(signer, JSON.stringify(slashPayload('ping'))),
            undefined,
            ctx
        );
        await ctx.settled();

        expect(response.status).toBe(202);
        expect(ran).toEqual(['ping']);
    });

    it('answers a signed PING with a PONG', async () => {
        const signer = await signedEnv();
        const seedcord = new Seedcord(config());

        const response = await seedcord.fetch(await signedRequest(signer, ping));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ type: 1 });
    });

    it('runs each plugin init() then ready() once across concurrent first requests', async () => {
        const calls: string[] = [];
        class Counter extends Plugin {
            public init(): Promise<void> {
                calls.push('init');
                return Promise.resolve();
            }
            public override ready(): Promise<void> {
                calls.push('ready');
                return Promise.resolve();
            }
        }
        const signer = await signedEnv();
        const seedcord = new Seedcord(config()).attach('counter', Counter);

        await Promise.all([
            seedcord.fetch(await signedRequest(signer, ping)),
            seedcord.fetch(await signedRequest(signer, ping))
        ]);

        expect(calls).toEqual(['init', 'ready']);
    });

    it('rolls back a failed plugin start and retries it on the next request', async () => {
        const calls: string[] = [];
        let down = true;
        class Database extends Plugin {
            public init(): Promise<void> {
                calls.push('database init');
                return Promise.resolve();
            }
            public override dispose(): Promise<void> {
                calls.push('database dispose');
                return Promise.resolve();
            }
        }
        class Cache extends Plugin {
            public init(): Promise<void> {
                calls.push('cache init');
                if (!down) return Promise.resolve();
                down = false;
                return Promise.reject(new Error('cache is down'));
            }
        }
        const signer = await signedEnv();
        const seedcord = new Seedcord(config()).attach('database', Database).attach('cache', Cache);

        await expect(seedcord.fetch(await signedRequest(signer, ping))).rejects.toThrow();
        const retried = await seedcord.fetch(await signedRequest(signer, ping));

        expect(retried.status).toBe(200);
        expect(calls).toEqual(['database init', 'cache init', 'database dispose', 'database init', 'cache init']);
    });

    it('runs a subscriber from the built files', async () => {
        const seen: string[] = [];
        @Subscribe('anyInteraction')
        class Seen extends Subscriber<'anyInteraction', CoreBase> {
            public execute(): Promise<void> {
                seen.push(String(this.data.interaction.type));
                return Promise.resolve();
            }
        }
        registerBuiltFiles({ '/subscribers/Seen.ts': { Seen } });
        const signer = await signedEnv();

        const seedcord = new Seedcord(config({ subscribers: `${BUILT_ROOT}/subscribers` }));
        await seedcord.fetch(await signedRequest(signer, unrouted));

        await vi.waitFor(() => {
            expect(seen).toEqual(['99']);
        });
    });

    it('refuses a plugin attached after the first request started it', async () => {
        const signer = await signedEnv();
        const seedcord = new Seedcord(config());
        await seedcord.fetch(await signedRequest(signer, ping));

        expect(() => seedcord.attach('late', Late)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginAfterInit })
        );
    });

    it('rejects a server-only plugin', () => {
        const seedcord = new Seedcord(config());

        // @ts-expect-error ServerOnly declares runtime 'server'
        expect(() => seedcord.attach('server', ServerOnly)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginScopeMismatch })
        );
    });

    it('resolves the application id from the token on the first request', async () => {
        const signer = await signedEnv();
        const seedcord = new Seedcord(config());

        expect(() => seedcord.applicationId).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreApplicationUnavailable })
        );
        await seedcord.fetch(await signedRequest(signer, ping));

        expect(seedcord.applicationId).toBe(APP_ID);
    });

    it('allows one Seedcord per isolate', () => {
        expect(() => new Seedcord(config())).not.toThrow();
        expect(() => new Seedcord(config())).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreSingletonViolation })
        );
    });

    it('reads no env until the first request', async () => {
        Envapter.useSource(new PortableSource({}));

        const seedcord = new Seedcord(config());

        await expect(seedcord.fetch(new Request('https://bot.example', { method: 'POST' }))).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.ConfigMissingEnv })
        );
    });

    it('rethrows a failed first request on every later one', async () => {
        Envapter.useSource(new PortableSource({}));
        const seedcord = new Seedcord(config());
        const first = await seedcord.fetch(new Request('https://bot.example')).catch((caught: unknown) => caught);

        const signer = await signedEnv();
        const second = await seedcord.fetch(await signedRequest(signer, ping)).catch((caught: unknown) => caught);

        expect(second).toBe(first);
    });
});
