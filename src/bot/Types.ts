import type { AtLeastOne } from '../core/library/types/Miscellaneous';
import type { ActionRowBuilder, EmbedBuilder, MessageActionRowComponentBuilder } from 'discord.js';

export interface MessageContent {
  embeds: EmbedBuilder[];
  components: [ActionRowBuilder<MessageActionRowComponentBuilder>];
}

export type AtleastOneMessageComponent = AtLeastOne<{ content: string } & MessageContent>;
