import 'reflect-metadata';

import { Notice } from '@seedcord/core';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SlashHandler } from '@handlers/interaction/SlashHandler';
import { createCore, dispatchInteraction } from '@src/dispatch/dispatchInteraction';
import { faultThrottle } from '@src/dispatch/reportFault';

import { slashPayload } from './harness';
import { nullPathConfig, VALID_TOKEN } from '../../helpers/fixtures';

import type { ValidInteractionTypes } from '@handlers/interactionTypes';
import type { SubscriptionData } from '@seedcord/core';
import type { ReplyResponse } from '@seedcord/types';
import type { ResolvedRoute } from '@src/dispatch/resolve';

vi.mock('@discordjs/rest', async (importOriginal) => {
    class FakeRest {
        public post = vi.fn().mockResolvedValue({ resource: { message: { id: 'm-1' } } });
        public patch = vi.fn().mockResolvedValue({ id: 'm-1' });

        public setToken(): this {
            return this;
        }
    }
    return { ...(await importOriginal<object>()), REST: FakeRest };
});

class Reported extends Notice {
    public override report = true;

    constructor() {
        super('reported through the boundary');
    }

    render(): ReplyResponse {
        return { components: [] };
    }
}

class NoticeHandler extends SlashHandler<never> {
    execute(): Promise<void> {
        throw new Reported();
    }
}

class BoomHandler extends SlashHandler<never> {
    execute(): Promise<void> {
        throw new Error('handler exploded');
    }
}

interface Published {
    handled: SubscriptionData<'handledException'>[];
    unknown: SubscriptionData<'unknownException'>[];
}

async function faultsFor(handler: unknown, payload = slashPayload('ok')): Promise<Published> {
    const core = createCore(nullPathConfig, VALID_TOKEN);
    const published: Published = { handled: [], unknown: [] };
    core.bus.on('handledException', (data) => published.handled.push(data));
    core.bus.on('unknownException', (data) => published.unknown.push(data));

    const match: ResolvedRoute = { kind: 'slash', routeId: 'slash:ok', load: () => Promise.resolve(handler) };
    const execute = await dispatchInteraction({ match, payload: payload as ValidInteractionTypes, core });
    await execute?.();
    return published;
}

beforeEach(() => {
    Envapter.useSource(new PortableSource({}));
    faultThrottle.clear();
});

afterEach(() => {
    Envapter.useSource(new PortableSource({}));
});

describe('http fault publishing', () => {
    it('publishes handledException with an interaction source for a reported Notice', async () => {
        const { handled, unknown } = await faultsFor(NoticeHandler);

        expect(unknown).toHaveLength(0);
        expect(handled).toHaveLength(1);
        expect(handled[0]?.denial).toBeInstanceOf(Reported);
        expect(handled[0]?.source).toMatchObject({
            kind: 'interaction',
            interactionKind: 'slash',
            command: 'ok',
            customId: null,
            userId: 'u1',
            interactionId: 'int-1'
        });
    });

    it('publishes unknownException for a raw throw', async () => {
        const { handled, unknown } = await faultsFor(BoomHandler);

        expect(handled).toHaveLength(0);
        expect(unknown).toHaveLength(1);
        expect(unknown[0]?.error.message).toBe('handler exploded');
    });

    it('reports the same route and error once per throttle window', async () => {
        const first = await faultsFor(BoomHandler);
        const second = await faultsFor(BoomHandler);

        expect(first.unknown).toHaveLength(1);
        expect(second.unknown).toHaveLength(0);
    });

    it('reports a different error on the same route separately', async () => {
        await faultsFor(BoomHandler);
        const { handled } = await faultsFor(NoticeHandler);

        expect(handled).toHaveLength(1);
    });
});
