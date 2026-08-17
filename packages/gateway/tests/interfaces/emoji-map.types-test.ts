import { expectTypeOf } from 'vitest';

import { Emojis } from '#bot/injectors/EmojiInjector';

import type { GatewayEmoji } from '#bot/injectors/index';
import type { ApplicationEmoji, GuildEmoji } from 'discord.js';

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

    expectTypeOf(Emojis.Confirm.source).toEqualTypeOf<ApplicationEmoji>();
    expectTypeOf(Emojis.Wave.source).toEqualTypeOf<GuildEmoji>();

    // @ts-expect-error 'Nope' is not a configured emoji key.
    void Emojis.Nope;
}

void typeChecks;
