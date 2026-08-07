import { ActionRowBuilder, TextDisplayBuilder } from '@discordjs/builders';
import { BuilderComponent } from '@seedcord/gateway';
import { ButtonStyle } from 'discord.js';

import type { ButtonBuilder } from '@discordjs/builders';
import type { PageView, PaginatorControls } from '@seedcord/gateway';

export interface FeedEvent {
    id: number;
    text: string;
}

export class FeedCard extends BuilderComponent<'container'> {
    constructor(view: PageView<FeedEvent>, controls: PaginatorControls) {
        super('container');

        this.instance
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## Activity feed\n${view.items.map((event) => `- ${event.text}`).join('\n')}`
                )
            )
            .addActionRowComponents(
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    controls.button('prev', { style: ButtonStyle.Primary, emoji: { name: '⬅️' } }),
                    controls.button('indicator'),
                    controls.button('next', { style: ButtonStyle.Primary, emoji: { name: '➡️' } })
                )
            );
    }
}
