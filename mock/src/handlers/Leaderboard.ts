import { ButtonHandler, ButtonRoute, CustomId, paginate, SlashHandler, SlashRoute } from 'seedcord';

import { LeaderboardCard, LeaderboardControls } from '../components/bundles/Leaderboard';

import type { LeaderboardEntry } from '../components/bundles/Leaderboard';
import type { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from '@discordjs/builders';

const PER_PAGE = 5;
const PAGE_BOUND = 999;
const ENTRY_COUNT = 23;
const SCORE_STEP = 100;

// the caller defines the cursor here. a plain prev/next never collides, so the slot is unnecessary.
const Board = new CustomId('lb').int('page', 0, PAGE_BOUND);

const SCORES: LeaderboardEntry[] = Array.from({ length: ENTRY_COUNT }, (_, index) => ({
    name: `Player ${index + 1}`,
    score: (ENTRY_COUNT - index) * SCORE_STEP
}));

// a headless render from the kit paginate() math and the caller's own cursor, without the Paginator.
function renderBoard(page: number): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
    const view = paginate(SCORES, page, PER_PAGE);
    const controls = new LeaderboardControls(
        view,
        Board.encode({ page: Math.max(0, view.page - 1) }),
        Board.encode({ page: view.page + 1 })
    );
    return { embeds: [new LeaderboardCard(view).component], components: [controls.component] };
}

@SlashRoute('leaderboard')
export class LeaderboardSlash extends SlashHandler<'leaderboard'> {
    public async execute(): Promise<void> {
        await this.event.reply(renderBoard(0));
    }
}

@ButtonRoute(Board)
export class LeaderboardNav extends ButtonHandler<[typeof Board]> {
    public async execute(): Promise<void> {
        await this.event.update(renderBoard(this.params.page));
    }
}
