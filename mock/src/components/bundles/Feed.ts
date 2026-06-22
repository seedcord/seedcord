import { ActionRowBuilder, ButtonStyle, TextDisplayBuilder } from 'discord.js';
import { BuilderComponent } from 'seedcord';

import type { ButtonBuilder } from 'discord.js';
import type { PageView, PaginatorControls } from 'seedcord';

/** One paginated activity event. */
export interface FeedEvent {
    id: number;
    text: string;
}

/** The complex paginator's styled page, holding the events and the hand-placed controls. */
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
                    controls.button('prev', { style: ButtonStyle.Primary, emoji: '⬅️' }),
                    controls.button('indicator'),
                    controls.button('next', { style: ButtonStyle.Primary, emoji: '➡️' })
                )
            );
    }
}
