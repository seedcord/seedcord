import { BuilderComponent } from '@seedcord/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';

class Card extends BuilderComponent<'container'> {
    constructor() {
        super('container');
    }
}

describe('config.botColor', () => {
    beforeEach(() => {
        // @ts-expect-error singleton reset between tests
        Seedcord.reset();
    });

    it('applies a color assigned after construction', () => {
        const host = new Seedcord({
            bot: { interactions: { path: null }, commands: { path: null } },
            subscribers: { path: null }
        });
        host.config.botColor = 0xfe_56_5a;
        expect(new Card().component.data.accent_color).toBe(0xfe_56_5a);
    });
});
