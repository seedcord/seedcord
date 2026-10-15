import { randomUUID } from 'node:crypto';

import { REST } from '@discordjs/rest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Notice } from '#stops/Notice';
import { HandledException } from '#subscribers/default/HandledException';
import { UnknownException } from '#subscribers/default/UnknownException';

import type { CoreBase } from '#interfaces/CoreBase';
import type { InteractionFaultSource } from '#subscribers/types/Subscriptions';
import type { ReplyResponse } from '@seedcord/types';

class Boom extends Notice {
    constructor() {
        super('boom');
    }

    render(): ReplyResponse {
        return { components: [] };
    }
}

const source: InteractionFaultSource = {
    kind: 'interaction',
    interactionKind: 'slash',
    command: 'ban',
    customId: null,
    userId: 'u1',
    guildId: 'g1',
    channelId: 'c1',
    interactionId: 'i1',
    raw: {}
};

// justified: the Subscriber base only stores core
const core = {} as unknown as CoreBase;

afterEach(() => {
    vi.restoreAllMocks();
});

describe('the two default reporters', () => {
    it('keep their own throttle windows on one route and one error name', async () => {
        const post = vi.spyOn(REST.prototype, 'post');
        const origin = 'slash:ban';
        const dispatchId = 'd-1';

        await new UnknownException({ uuid: randomUUID(), dispatchId, error: new Boom(), origin }, core).execute();
        await new HandledException(
            { denial: new Boom(), uuid: randomUUID(), dispatchId, origin, source },
            core
        ).execute();

        expect(post).toHaveBeenCalledTimes(2);
    });
});
