import type { AtLeastOne } from './Misc';
import type { EmbedBuilder, ActionRowBuilder, MessageActionRowComponentBuilder } from 'discord.js';

/** Discord message content with embeds and components */
export interface MessageContent {
  embeds: EmbedBuilder[];
  components: [ActionRowBuilder<MessageActionRowComponentBuilder>];
}

/** Discord message that requires at least one of content, embeds, or components */
export type AtleastOneMessageComponent = AtLeastOne<{ content: string } & MessageContent>;
