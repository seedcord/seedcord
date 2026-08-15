import { randomUUID } from 'node:crypto';

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { Notice } from '#stops/Notice';
import { HandledException } from '#subscribers/default/HandledException';
import { UnknownException } from '#subscribers/default/UnknownException';

import type { CoreBase } from '#interfaces/CoreBase';
import type { InteractionFaultSource } from '#subscribers/types/Subscriptions';
import type { ReplyResponse } from '@seedcord/types';

const hoisted = vi.hoisted(() => {
    process.env.UNKNOWN_EXCEPTION_WEBHOOK_URL = 'https://discord.com/api/webhooks/11/unknown-tok';
    process.env.HANDLED_EXCEPTION_WEBHOOK_URL = 'https://discord.com/api/webhooks/22/handled-tok';
    return { postMock: vi.fn() };
});

vi.mock('@discordjs/rest', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    REST: class {
        post = hoisted.postMock;
    }
}));

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

beforeEach(() => {
    hoisted.postMock.mockReset().mockResolvedValue(undefined);
});

describe('the two default reporters', () => {
    it('keep their own throttle windows on one route and one error name', async () => {
        const routeId = 'slash:ban';

        await new UnknownException({ uuid: randomUUID(), error: new Boom(), routeId }, core).execute();
        await new HandledException({ denial: new Boom(), uuid: randomUUID(), routeId, source }, core).execute();

        expect(hoisted.postMock).toHaveBeenCalledTimes(2);
    });
});
