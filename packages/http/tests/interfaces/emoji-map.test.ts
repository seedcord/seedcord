import { describe, expect, expectTypeOf, it } from 'vitest';

import { Emojis } from '@src/emojis/EmojiInjector';

import type { ResolvedEmoji } from '@src/emojis/EmojiInjector';

// each @ts-expect-error fails the typecheck if its guard stops being an error. vitest never runs these.

// augment EmojiMap exactly as `seedcord codegen` emits it, a string config tags 'application' and a tuple tags 'guild'
declare module '@seedcord/types' {
    interface EmojiMap {
        Confirm: 'application';
        Wave: 'guild';
    }
}

function typeChecks(): void {
    // http resolves both tags to one value type
    expectTypeOf(Emojis.Confirm).toEqualTypeOf<ResolvedEmoji>();
    expectTypeOf(Emojis.Wave).toEqualTypeOf<ResolvedEmoji>();

    // @ts-expect-error 'Nope' is not a configured emoji key.
    void Emojis.Nope;
}

describe('Emojis', () => {
    it('types every configured key as a resolved emoji', () => {
        expect(typeof typeChecks).toBe('function');
    });
});
