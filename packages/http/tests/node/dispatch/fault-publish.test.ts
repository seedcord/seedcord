import 'reflect-metadata';

import { Notice } from '@seedcord/core';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { createCore, dispatchInteraction } from '#src/dispatch/dispatchInteraction';

import { slashPayload } from './harness';
import { nullPathConfig, VALID_TOKEN } from '../../helpers/fixtures';

import type { ValidInteractionTypes } from '#handlers/interactionTypes';
import type { Core } from '#interfaces/Core';
import type { ResolvedRoute } from '#src/dispatch/resolve';
import type { SubscriptionData } from '@seedcord/core';
import type { ReplyResponse } from '@seedcord/types';

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

class RawThrowHandler extends SlashHandler<never> {
    execute(): Promise<void> {
        // eslint-disable-next-line no-throw-literal, @typescript-eslint/only-throw-error -- a non-Error throw is what this pins
        throw 'nope';
    }
}

class BoomHandler extends SlashHandler<never> {
    execute(): Promise<void> {
        throw new Error('handler exploded');
    }
}

class OtherBoomHandler extends SlashHandler<never> {
    execute(): Promise<void> {
        throw new Error('rank lookup failed');
    }
}

interface Published {
    handled: SubscriptionData<'handledException'>[];
    unknown: SubscriptionData<'unknownException'>[];
}

function watched(): { core: Core; published: Published } {
    const core = createCore(nullPathConfig, VALID_TOKEN);
    const published: Published = { handled: [], unknown: [] };
    core.bus.on('handledException', (data) => published.handled.push(data));
    core.bus.on('unknownException', (data) => published.unknown.push(data));
    return { core, published };
}

async function dispatchThrough(core: Core, handler: unknown): Promise<void> {
    const match: ResolvedRoute = { kind: 'slash', routeId: 'slash:ok', load: () => Promise.resolve(handler) };
    const execute = await dispatchInteraction({
        match,
        payload: slashPayload('ok') as ValidInteractionTypes,
        core
    });
    await execute?.();
}

async function faultsFor(handler: unknown): Promise<Published> {
    const { core, published } = watched();
    await dispatchThrough(core, handler);
    return published;
}

beforeEach(() => {
    Envapter.useSource(new PortableSource({}));
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

    it('publishes the dispatch routeId, so a subscriber can group faults by route', async () => {
        const { unknown } = await faultsFor(BoomHandler);

        expect(unknown[0]?.routeId).toBe('slash:ok');
    });

    it('publishes both bugs when one route throws two different errors', async () => {
        const { core, published } = watched();

        await dispatchThrough(core, BoomHandler);
        await dispatchThrough(core, OtherBoomHandler);

        expect(published.unknown.map((fault) => fault.error.message)).toEqual([
            'handler exploded',
            'rank lookup failed'
        ]);
    });

    it('wraps a non-Error throw, so it reports like any other raw fault', async () => {
        const { handled, unknown } = await faultsFor(RawThrowHandler);

        expect(handled).toHaveLength(0);
        expect(unknown).toHaveLength(1);
        expect(unknown[0]?.error.message).toBe('nope');
    });

    it('publishes a repeat of the same fault every time it happens', async () => {
        const { core, published } = watched();

        await dispatchThrough(core, BoomHandler);
        await dispatchThrough(core, BoomHandler);

        expect(published.unknown).toHaveLength(2);
    });
});
