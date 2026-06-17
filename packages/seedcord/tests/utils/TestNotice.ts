import { Notice } from '@seedcord/kit';

import type { ReplyResponse } from '@seedcord/types';

export class TestNotice extends Notice {
    constructor(message = 'test denial') {
        super(message);
    }

    render(): ReplyResponse {
        return { components: [] };
    }
}
