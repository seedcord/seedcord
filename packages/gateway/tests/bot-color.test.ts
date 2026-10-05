import { BuilderComponent } from '@seedcord/core';
import { describe, it, expect, beforeEach } from 'vitest';

import { Seedcord } from '#src/Seedcord';

import './utils/mock-env';

class Card extends BuilderComponent<'container'> {
    constructor() {
        super('container');
    }
}

describe('config.botColor', () => {
    beforeEach(() => {
        // @ts-expect-error reset the Seedcord singleton between tests
        Seedcord.reset();
    });

    it('applies a color assigned after construction', () => {
        const bot = new Seedcord({
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
