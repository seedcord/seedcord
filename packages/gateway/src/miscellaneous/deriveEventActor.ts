import { GuildMember, Message, User } from 'discord.js';

import type { Guild, PartialMessage } from 'discord.js';

export interface EventActor {
    guild: Guild | null;
    member: GuildMember | null;
    user: User | null;
    channelId: string | null;
}

function actorOf(message: Message | PartialMessage): EventActor {
    return { guild: message.guild, member: message.member, user: message.author, channelId: message.channelId };
}

// each event passes the actor in a different argument
export function deriveEventActor(args: unknown): EventActor {
    const tuple = Array.isArray(args) ? (args as unknown[]) : [args];
    let partial: PartialMessage | undefined;
    for (const arg of tuple) {
        if (arg instanceof Message) {
            // instanceof also matches a partial, the old copy discord.js passes for an uncached message
            const message = arg as Message | PartialMessage;
            if (!message.partial) return actorOf(message);
            partial ??= message;
        }
        if (arg instanceof GuildMember) return { guild: arg.guild, member: arg, user: arg.user, channelId: null };
        if (arg instanceof User) return { guild: null, member: null, user: arg, channelId: null };
    }
    return partial ? actorOf(partial) : { guild: null, member: null, user: null, channelId: null };
}
