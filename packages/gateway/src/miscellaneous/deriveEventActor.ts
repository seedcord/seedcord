import { GuildMember, Message, MessageReaction, User, VoiceState } from 'discord.js';

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

function actorOfVoice(state: VoiceState): EventActor {
    return { guild: state.guild, member: state.member, user: state.member?.user ?? null, channelId: state.channelId };
}

function placeOf(reaction: MessageReaction | undefined): Pick<EventActor, 'guild' | 'channelId'> {
    return { guild: reaction?.message.guild ?? null, channelId: reaction?.message.channelId ?? null };
}

// each event passes the actor in a different argument
export function deriveEventActor(args: unknown): EventActor {
    const tuple = Array.isArray(args) ? (args as unknown[]) : [args];
    let partial: PartialMessage | undefined;
    let reaction: MessageReaction | undefined;
    let voice: VoiceState | undefined;
    for (const arg of tuple) {
        if (arg instanceof MessageReaction) reaction = arg;
        // the new state wins because voiceStateUpdate passes the old one first
        if (arg instanceof VoiceState) voice = arg;
        if (arg instanceof Message) {
            // instanceof also matches a partial, the old copy discord.js passes for an uncached message
            const message = arg as Message | PartialMessage;
            if (!message.partial) return actorOf(message);
            partial ??= message;
        }
        if (arg instanceof GuildMember) return { guild: arg.guild, member: arg, user: arg.user, channelId: null };
        if (arg instanceof User) return { ...placeOf(reaction), member: null, user: arg };
    }
    if (voice) return actorOfVoice(voice);
    return partial ? actorOf(partial) : { ...placeOf(reaction), member: null, user: null };
}
