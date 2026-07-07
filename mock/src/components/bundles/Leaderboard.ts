import { ButtonBuilder } from '@discordjs/builders';
import { ButtonStyle } from 'discord.js';
import { BuilderComponent, RowComponent } from '@seedcord/gateway';

import type { PageView } from '@seedcord/gateway';

/** One leaderboard row. */
export interface LeaderboardEntry {
    name: string;
    score: number;
}

/** The leaderboard page as an embed (the headless path uses embeds, with no components-v2 flag). */
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

/** Prev/Next for the headless leaderboard, stamped with the caller's own cursor wires. */
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
