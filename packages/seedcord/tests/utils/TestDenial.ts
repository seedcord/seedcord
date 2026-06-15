import { Denial } from '@seedcord/kit';

import type { ReplyResponse } from '@seedcord/types';

export class TestDenial extends Denial {
    constructor(message = 'test denial') {
        super(message);
    }

    render(): ReplyResponse {
        return { kind: 'embed', embeds: [] };
    }
}
