import { expectTypeOf } from 'vitest';

import { SlashHandler } from '#handlers/interaction/SlashHandler';

import type { CacheFor } from '@seedcord/core/internal';
import type { Guild } from 'discord.js';

// Compile-time spec for the cache state a handler derives from its command's contexts. Routes here are
// distinct from the other interface tests to avoid a duplicate registry augmentation.
declare module '@seedcord/core' {
    interface SlashRegistry {
        roll: { options: {}; cache: 'cached' };
        support: { options: {}; cache: undefined };
        streak: { options: {}; cache: 'cached' };
        legacy: { options: {} };
    }
}

class Roll extends SlashHandler<'roll'> {
    async execute(): Promise<void> {
        expectTypeOf(this.event.guild).toEqualTypeOf<Guild>();
        await Promise.resolve();
    }
}
void Roll;

class Support extends SlashHandler<'support'> {
    async execute(): Promise<void> {
        expectTypeOf(this.event.guild).toEqualTypeOf<Guild | null>();
        await Promise.resolve();
    }
}
void Support;

// an explicit argument overrides what the contexts derived
class Claimed extends SlashHandler<'support', 'cached'> {
    async execute(): Promise<void> {
        expectTypeOf(this.event.guild).toEqualTypeOf<Guild>();
        await Promise.resolve();
    }
}
void Claimed;

expectTypeOf<CacheFor<'roll' | 'streak'>>().toEqualTypeOf<'cached'>();
expectTypeOf<CacheFor<'roll' | 'support' | 'streak'>>().toEqualTypeOf<undefined>();

expectTypeOf<CacheFor<'legacy'>>().toEqualTypeOf<undefined>();
expectTypeOf<CacheFor<never>>().toEqualTypeOf<undefined>();
