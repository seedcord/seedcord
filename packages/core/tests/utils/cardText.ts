import { serializeReply } from '#reply/serializeReply';

import type { ReplyResponse } from '@seedcord/types';

/** The first V2 component of a reply, serialized for a test to assert on its rendered text. */
export function cardJson(reply: ReplyResponse): string {
    const [first] = serializeReply(reply, 'test').components;
    if (!first) throw new Error('reply has no components');
    return JSON.stringify(first);
}
