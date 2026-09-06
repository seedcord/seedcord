import { expectTypeOf } from 'vitest';

import { UserContextMenuHandler } from '#handlers/interaction/ContextMenuHandler';

import type { MenuCacheFor } from '@seedcord/core/internal';
import type { ApplicationCommandType, GuildMember } from 'discord.js';

// Compile-time spec for the cache a context-menu handler derives from its command's contexts.
declare module '@seedcord/core' {
    interface UserContextMenuRegistry {
        'View Profile': { cache: 'cached' };
        'Say Hello': { cache: undefined };
    }
}

class ViewProfile extends UserContextMenuHandler<'View Profile'> {
    async execute(): Promise<void> {
        expectTypeOf(this.targetMember).toEqualTypeOf<GuildMember | null>();
        await Promise.resolve();
    }
}
void ViewProfile;

expectTypeOf<MenuCacheFor<ApplicationCommandType.User, 'View Profile'>>().toEqualTypeOf<'cached'>();
expectTypeOf<MenuCacheFor<ApplicationCommandType.User, 'Say Hello'>>().toEqualTypeOf<undefined>();
expectTypeOf<MenuCacheFor<ApplicationCommandType.User, 'View Profile' | 'Say Hello'>>().toEqualTypeOf<undefined>();
