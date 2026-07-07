import { ButtonRoute, CursorSource, Paginator, SlashHandler, SlashRoute } from '@seedcord/gateway';

import { FeedCard } from '../components/bundles/Feed';

import type { FeedEvent } from '../components/bundles/Feed';

const TOTAL_EVENTS = 43;

// a simulated paged feed, so a CursorSource has no cheap total (no last button, indicator "Page X").
function fetchEvents(page: number, perPage: number): { items: FeedEvent[]; hasNext: boolean } {
    const start = page * perPage;
    const count = Math.min(perPage, Math.max(0, TOTAL_EVENTS - start));
    const items = Array.from({ length: count }, (_, offset) => ({
        id: start + offset,
        text: `Activity #${start + offset + 1}`
    }));
    return { items, hasNext: start + perPage < TOTAL_EVENTS };
}

export const Feed = new Paginator({
    prefix: 'feed',
    source: new CursorSource((_ctx, page, perPage) => fetchEvents(page, perPage), { perPage: 5 }),
    render: (view, controls) => [new FeedCard(view, controls).component],
    ephemeral: true
});

@ButtonRoute(Feed.cursor)
export class FeedNav extends Feed.Handler {}

@SlashRoute('feed')
export class FeedSlash extends SlashHandler<'feed'> {
    public async execute(): Promise<void> {
        await Feed.start(this.event);
    }
}
