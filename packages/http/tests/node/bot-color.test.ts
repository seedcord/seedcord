import { BuilderComponent } from '@seedcord/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { resetSeedcord, serverConfig } from '#tests/helpers/nodeHost';

class Card extends BuilderComponent<'container'> {
    constructor() {
        super('container');
    }
}

describe('config.botColor', () => {
    beforeEach(resetSeedcord);

    it('applies a color assigned after construction', () => {
        const host = new Seedcord(serverConfig());
        host.config.botColor = 0xfe_56_5a;
        expect(new Card().component.data.accent_color).toBe(0xfe_56_5a);
    });
});
