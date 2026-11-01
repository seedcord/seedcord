import { defineGate, Silence } from '@seedcord/core';
import { FormattingPatterns } from 'discord.js';

import type { EventGateContext } from '#bot/gates/Gate';
import type { Message, PartialMessage } from 'discord.js';

function startsWithBotMention(message: Message | PartialMessage): boolean {
    const match = FormattingPatterns.User.exec(message.content?.trimStart() ?? '');
    return match?.index === 0 && match.groups?.id === message.client.user.id;
}

/**
 * Passes only a message that starts with a mention of the bot, like `@bot ping`. It ignores every other message
 * with a {@link Silence}, including a reply that pings the bot, a role mention, and a mention later in the text.
 *
 * On `messageUpdate` it passes only when the edit adds the mention. An edit that keeps it doesn't run the handler
 * again. Attach it without calling it, since it takes no options.
 *
 * A handler behind this gate can read `content` without the Message Content intent, because Discord sends the text of
 * a message that mentions the bot.
 *
 * @see {@link Gated}
 *
 * @example
 * ```ts
 * import { Events } from 'discord.js';
 *
 * \@Gated(IgnoreBots, MentionPrefix)
 * \@RegisterEvent([Events.MessageCreate], [Events.MessageUpdate])
 * class MentionCommands extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
 *     async execute() {
 *         // ...
 *     }
 * }
 * ```
 */
export const MentionPrefix = defineGate(
    'MentionPrefix',
    ({ payload }: EventGateContext<'messageCreate' | 'messageUpdate'>) => {
        const started =
            payload.length === 1
                ? startsWithBotMention(payload[0])
                : !startsWithBotMention(payload[0]) && startsWithBotMention(payload[1]);
        if (!started) throw new Silence('message does not start with a mention of the bot');
    }
);
