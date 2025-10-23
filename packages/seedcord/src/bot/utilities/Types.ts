import type { ActionRowBuilder, EmbedBuilder, MessageActionRowComponentBuilder } from 'discord.js';
import type { RequireAtLeastOne } from 'type-fest';

/** Discord message content with embeds and components */
export interface MessageContent {
    embeds: EmbedBuilder[];
    components: [ActionRowBuilder<MessageActionRowComponentBuilder>];
}

/** Discord message that requires at least one of content, embeds, or components */
export type AtleastOneMessageComponent = RequireAtLeastOne<{ content: string } & MessageContent>;
