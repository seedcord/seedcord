import type { AtLeastOne } from './Misc';
import type { EmbedBuilder, ActionRowBuilder, MessageActionRowComponentBuilder } from 'discord.js';

export interface MessageContent {
  embeds: EmbedBuilder[];
  components: [ActionRowBuilder<MessageActionRowComponentBuilder>];
}

export type AtleastOneMessageComponent = AtLeastOne<{ content: string } & MessageContent>;
