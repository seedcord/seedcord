import { describe, expect, it } from 'vite-plus/test';

import { ogPageCardAlt } from '#src/OgCard.tsx';

describe('ogPageCardAlt', () => {
    it('reads the name and the pill the card draws', () => {
        expect(ogPageCardAlt({ pill: 'commands', name: 'Options', meta: [] })).toBe(
            'A seedcord card reading Options, labelled commands'
        );
    });

    it('adds the badges beside the pill', () => {
        expect(ogPageCardAlt({ pill: 'class', name: 'SlashHandler', meta: ['@seedcord/gateway', 'v0.6.0'] })).toBe(
            'A seedcord card reading SlashHandler, labelled class, @seedcord/gateway, v0.6.0'
        );
    });
});
