import { Role } from 'discord.js';

import type { GuildMember } from 'discord.js';

// whose permissions a check ran against, mentioned as the refusal subject
type PermSubject = Role | GuildMember;

export function mentionFor(subject: PermSubject): string {
    if (subject instanceof Role) return `<@&${subject.id}>`;
    return `<@${subject.id}>`;
}
