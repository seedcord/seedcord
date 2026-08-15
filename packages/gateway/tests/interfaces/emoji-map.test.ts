import { describe, expect, expectTypeOf, it } from 'vitest';

import { Emojis } from '#bot/injectors/EmojiInjector';

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
    expectTypeOf(Emojis.Confirm).toEqualTypeOf<ApplicationEmoji>();
    expectTypeOf(Emojis.Wave).toEqualTypeOf<GuildEmoji>();

    // @ts-expect-error 'Nope' is not a configured emoji key.
    void Emojis.Nope;
}

describe('Emojis', () => {
    it('types each key as the precise resolved emoji class', () => {
        expect(typeof typeChecks).toBe('function');
    });
});
