import type { AtleastOneMessageComponent } from '../Types';
import type { Nullable } from '@seedcord/types';
import type { Message, User } from 'discord.js';

/**
 * Sends a direct message to a user.
 *
 * @param user - The user to send the DM to
 * @param content - Message content with embeds, components, etc.
 * @returns Promise resolving to the sent message, or null if DM failed
 */
export async function attemptSendDM(user: User, content: AtleastOneMessageComponent): Promise<Nullable<Message>> {
    const payload = {
        ...(content.content !== undefined && { content: content.content }),
        ...(content.embeds !== undefined && { embeds: [...content.embeds] }),
        ...(content.components !== undefined && {
            components: [...content.components]
        })
    };

    try {
        return await user.send(payload);
    } catch {
        return null;
    }
}
