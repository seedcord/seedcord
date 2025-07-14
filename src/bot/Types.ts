import { ActionRowBuilder, EmbedBuilder, MessageActionRowComponentBuilder } from 'discord.js';
import { AtLeastOne } from '../core/library/types/Miscellaneous';

export type MessageContent = {
  embeds: EmbedBuilder[];
  components: [ActionRowBuilder<MessageActionRowComponentBuilder>];
};

export type AtleastOneMessageComponent = AtLeastOne<{ content: string } & MessageContent>;
