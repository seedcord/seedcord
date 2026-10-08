import { BuilderComponent } from '@seedcord/core';
import { describe, it, expect } from 'vitest';

import { Seedcord } from '#src/Seedcord';

import './utils/mock-env';

class Card extends BuilderComponent<'container'> {
    constructor() {
        super('container');
    }
}

describe('config.botColor', () => {
    it('applies a color assigned after construction', async () => {
        await using bot = new Seedcord({
            bot: {
                clientOptions: { intents: [] },
                interactions: { path: null },
                commands: { path: null },
                events: { path: null }
            },
            subscribers: { path: null }
        });
        bot.config.botColor = 0xfe_56_5a;
        expect(new Card().component.data.accent_color).toBe(0xfe_56_5a);
    });
});
