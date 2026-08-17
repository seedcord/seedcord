import { describe, expect, expectTypeOf, it } from 'vitest';

import { Emojis } from '#bot/injectors/EmojiInjector';

import type { GatewayEmoji } from '#bot/injectors/index';
import type { ApplicationEmoji, GuildEmoji } from 'discord.js';

// each @ts-expect-error fails the typecheck if its guard stops being an error. vitest never runs these.

// augment EmojiMap exactly as `seedcord codegen` emits it, a string config tags 'application' and a tuple tags 'guild'
declare module '@seedcord/types' {
    interface EmojiMap {
        Confirm: 'application';
        Wave: 'guild';
    }
}

function typeChecks(): void {
    expectTypeOf(Emojis.Confirm).toEqualTypeOf<GatewayEmoji<ApplicationEmoji>>();
    expectTypeOf(Emojis.Wave).toEqualTypeOf<GatewayEmoji<GuildEmoji>>();

    // reading source takes no narrowing
    expectTypeOf(Emojis.Confirm.source).toEqualTypeOf<ApplicationEmoji>();
    expectTypeOf(Emojis.Wave.source).toEqualTypeOf<GuildEmoji>();

    // @ts-expect-error 'Nope' is not a configured emoji key.
    void Emojis.Nope;
}

describe('Emojis', () => {
    it('types each key by its codegen tag and keeps the builder-safe wire fields', () => {
        expect(typeof typeChecks).toBe('function');
    });
});
