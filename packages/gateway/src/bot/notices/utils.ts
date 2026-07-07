import { GuildMember, Role, TextChannel } from 'discord.js';

import type { Guild } from 'discord.js';

/** Whose permissions a check ran against, used to mention and label the subject in a refusal. */
export type PermSubject = Role | TextChannel | Guild | GuildMember;

export function mentionFor(subject: PermSubject): string {
    if (subject instanceof Role) return `<@&${subject.id}>`;
    if (subject instanceof TextChannel) return `<#${subject.id}>`;
    if (subject instanceof GuildMember) return `<@${subject.id}>`;
    return `\`${subject.name}\``;
}

export function labelFor(subject: PermSubject): string {
    if (subject instanceof Role) return 'role';
    if (subject instanceof TextChannel) return 'channel';
    if (subject instanceof GuildMember) return 'member';
    return 'guild';
}
