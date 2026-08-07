import { ButtonBuilder } from '@discordjs/builders';
import { BuilderComponent, RowComponent } from '@seedcord/gateway';
import { ButtonStyle } from 'discord.js';

import type { PageView } from '@seedcord/gateway';

export interface LeaderboardEntry {
    name: string;
    score: number;
}

/** the headless path has no components-v2 flag. */
export class LeaderboardCard extends BuilderComponent<'embed'> {
    constructor(view: PageView<LeaderboardEntry>) {
        super('embed');

        const lines = view.items.map(
            (entry, offset) => `**${view.page * view.perPage + offset + 1}.** ${entry.name} — ${entry.score}`
        );
        this.instance
            .setTitle('Leaderboard')
            .setDescription(lines.join('\n'))
            .setFooter({ text: `Page ${view.page + 1} of ${view.totalPages ?? '?'}` });
    }
}

export class LeaderboardControls extends RowComponent<'button'> {
    constructor(view: PageView<LeaderboardEntry>, prevId: string, nextId: string) {
        super('button');

        this.instance.addComponents(
            new ButtonBuilder()
                .setCustomId(prevId)
                .setLabel('Prev')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!view.hasPrev),
            new ButtonBuilder()
                .setCustomId(nextId)
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!view.hasNext)
        );
    }
}
