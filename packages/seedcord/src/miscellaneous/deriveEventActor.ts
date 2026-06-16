import { GuildMember, Message, User } from 'discord.js';

import type { Guild } from 'discord.js';

export interface EventActor {
    guild: Guild | null;
    user: User | null;
    channelId: string | null;
}

// the actor sits in a different arg per event, so scan the tuple for the common carriers, best-effort
export function deriveEventActor(args: unknown): EventActor {
    const tuple = Array.isArray(args) ? (args as unknown[]) : [args];
    for (const arg of tuple) {
        if (arg instanceof Message) return { guild: arg.guild, user: arg.author, channelId: arg.channelId };
        if (arg instanceof GuildMember) return { guild: arg.guild, user: arg.user, channelId: null };
        if (arg instanceof User) return { guild: null, user: arg, channelId: null };
    }
    return { guild: null, user: null, channelId: null };
}
