import type { ActionRowBuilder, EmbedBuilder, MessageActionRowComponentBuilder } from 'discord.js';
import type { AtLeastOne } from '../core/library/types/Miscellaneous';

export type MessageContent = {
  embeds: EmbedBuilder[];
  components: [ActionRowBuilder<MessageActionRowComponentBuilder>];
};

export type AtleastOneMessageComponent = AtLeastOne<{ content: string } & MessageContent>;
