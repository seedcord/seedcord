import type { ReplyResponse } from '@seedcord/types';

/** The first V2 component of a reply, serialized, so a test can assert on its rendered text. */
export function cardJson(reply: ReplyResponse): string {
    const first = reply.components[0];
    if (!first) throw new Error('reply has no components');
    return JSON.stringify(first.toJSON());
}
