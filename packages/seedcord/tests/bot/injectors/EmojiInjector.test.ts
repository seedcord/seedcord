import { SeedcordErrorCode } from '@seedcord/errors';
import { Collection } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EmojiInjector, Emojis } from '@bot/injectors/EmojiInjector';

import type { Core } from '@interfaces/Core';

interface EmojiStub {
    id: string;
    name: string;
}

interface StubOptions {
    emojis: Record<string, string | readonly [string, string]>;
    appEmojis?: EmojiStub[];
    guilds?: Record<string, EmojiStub[]>;
}

function cacheOf(emojis: EmojiStub[]): Collection<string, EmojiStub> {
    const cache = new Collection<string, EmojiStub>();
    for (const emoji of emojis) cache.set(emoji.id, emoji);
    return cache;
}

function stubCore(opts: StubOptions): Core {
    const guilds = new Collection<string, unknown>();
    for (const [guildId, emojis] of Object.entries(opts.guilds ?? {})) {
        guilds.set(guildId, { emojis: { fetch: vi.fn().mockResolvedValue(undefined), cache: cacheOf(emojis) } });
    }

    // fixture: the injector reads only config.bot.emojis and client.application.emojis / client.guilds.cache
    return {
        config: { bot: { emojis: opts.emojis } },
        bot: {
            client: {
                application: {
                    emojis: { fetch: vi.fn().mockResolvedValue(undefined), cache: cacheOf(opts.appEmojis ?? []) }
                },
                guilds: { cache: guilds }
            }
        }
    } as unknown as Core;
}

// the global is typed by the (empty in tests) EmojiMap, so read runtime values through a plain record
const stored = Emojis as Record<string, unknown>;

async function initError(core: Core): Promise<Error | null> {
    return new EmojiInjector(core).init().then(
        () => null,
        (error: unknown) => error as Error
    );
}

describe('EmojiInjector', () => {
    afterEach(() => {
        for (const key of Object.keys(stored)) Reflect.deleteProperty(stored, key);
    });

    it('skips when no emojis are configured', async () => {
        await expect(new EmojiInjector(stubCore({ emojis: {} })).init()).resolves.toBeUndefined();
    });

    it('stores the resolved emoji object on a hit', async () => {
        const check: EmojiStub = { id: '1', name: 'check' };
        await new EmojiInjector(stubCore({ emojis: { Confirm: 'check' }, appEmojis: [check] })).init();
        expect(stored.Confirm).toBe(check);
    });

    it('resolves a tuple emoji from its guild', async () => {
        const wave: EmojiStub = { id: '9', name: 'wave' };
        await new EmojiInjector(stubCore({ emojis: { Wave: ['wave', 'g1'] }, guilds: { g1: [wave] } })).init();
        expect(stored.Wave).toBe(wave);
    });

    it('collects every unresolvable emoji into one error rather than throwing on the first', async () => {
        const error = await initError(stubCore({ emojis: { Confirm: 'check', Cancel: 'cross' }, appEmojis: [] }));

        expect(error).toMatchObject({ code: SeedcordErrorCode.ConfigEmojiUnresolved });
        expect(error?.message).toContain('check');
        expect(error?.message).toContain('cross');
    });

    it('reports an uncached guild for a tuple emoji', async () => {
        const error = await initError(stubCore({ emojis: { Wave: ['wave', 'g1'] } }));

        expect(error).toMatchObject({ code: SeedcordErrorCode.ConfigEmojiUnresolved });
        expect(error?.message).toContain('g1');
    });

    it('reports a tuple emoji missing from a present guild', async () => {
        const error = await initError(stubCore({ emojis: { Wave: ['wave', 'g1'] }, guilds: { g1: [] } }));

        expect(error).toMatchObject({ code: SeedcordErrorCode.ConfigEmojiUnresolved });
        expect(error?.message).toContain('wave');
        expect(error?.message).toContain('g1');
    });

    it('reports a config value that is neither a name nor a tuple', async () => {
        // fixture: a non-string, non-tuple value to exercise the invalid-value branch
        const error = await initError(stubCore({ emojis: { Bad: 42 as unknown as string } }));

        expect(error).toMatchObject({ code: SeedcordErrorCode.ConfigEmojiUnresolved });
        expect(error?.message).toContain('invalid value');
    });

    it('fetches a guild before reading its emoji cache', async () => {
        const wave: EmojiStub = { id: '9', name: 'wave' };
        const cache = new Collection<string, EmojiStub>();
        // the emoji only appears after fetch, so dropping the fetch leaves the cache empty and resolution fails
        const guild = {
            emojis: {
                fetch: vi.fn(() => {
                    cache.set(wave.id, wave);
                    return Promise.resolve();
                }),
                cache
            }
        };
        const guilds = new Collection<string, unknown>();
        guilds.set('g1', guild);
        const core = {
            config: { bot: { emojis: { Wave: ['wave', 'g1'] } } },
            bot: {
                client: {
                    application: { emojis: { fetch: vi.fn().mockResolvedValue(undefined), cache: cacheOf([]) } },
                    guilds: { cache: guilds }
                }
            }
        } as unknown as Core;

        await new EmojiInjector(core).init();

        expect(guild.emojis.fetch).toHaveBeenCalled();
        expect(stored.Wave).toBe(wave);
    });

    it('fetches a guild only once when several emojis come from it', async () => {
        const wave: EmojiStub = { id: '1', name: 'wave' };
        const smile: EmojiStub = { id: '2', name: 'smile' };
        const fetch = vi.fn().mockResolvedValue(undefined);
        const guild = { emojis: { fetch, cache: cacheOf([wave, smile]) } };
        const guilds = new Collection<string, unknown>();
        guilds.set('g1', guild);
        const core = {
            config: { bot: { emojis: { Wave: ['wave', 'g1'], Smile: ['smile', 'g1'] } } },
            bot: {
                client: {
                    application: { emojis: { fetch: vi.fn().mockResolvedValue(undefined), cache: cacheOf([]) } },
                    guilds: { cache: guilds }
                }
            }
        } as unknown as Core;

        await new EmojiInjector(core).init();

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(stored.Wave).toBe(wave);
        expect(stored.Smile).toBe(smile);
    });
});
