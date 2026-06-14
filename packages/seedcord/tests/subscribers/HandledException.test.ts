import '../utils/mock-env';

import { describe, expect, it } from 'vitest';

import { CustomId } from '@customId/index';
import { Denial } from '@interfaces/Components';
import { causeStack, faultRouteKey } from '@subscribers/default/HandledException';

import type { ReplyResponse } from '@seedcord/types';
import type { FaultSource } from '@subscribers/types/Subscriptions';

class TestFault extends Denial {
    constructor(message = 'boom', cause?: unknown) {
        super(message, cause === undefined ? undefined : { cause });
    }
    render(): ReplyResponse {
        return { kind: 'embed', embeds: [] };
    }
}

function componentSource(customId: string): FaultSource {
    return {
        kind: 'interaction',
        interactionKind: 'button',
        command: null,
        customId,
        userId: 'u',
        guildId: null,
        channelId: null,
        interactionId: 'i',
        raw: {}
    };
}

function slashSource(command: string): FaultSource {
    return { ...componentSource(''), interactionKind: 'slash', command, customId: null };
}

describe('causeStack', () => {
    it('uses an Error cause stack', () => {
        const cause = new Error('driver down');
        expect(causeStack(new TestFault('x', cause))).toBe(cause.stack);
    });

    it('returns a string cause as-is', () => {
        expect(causeStack(new TestFault('x', 'plain reason'))).toBe('plain reason');
    });

    it('does not throw on a bigint cause', () => {
        expect(causeStack(new TestFault('x', 10n))).toBe('10');
    });

    it('does not throw on a circular-object cause', () => {
        const circular: Record<string, unknown> = {};
        circular.self = circular;
        expect(() => causeStack(new TestFault('x', circular))).not.toThrow();
    });
});

describe('faultRouteKey', () => {
    it('keys a slash fault on its full route plus the denial name', () => {
        expect(faultRouteKey(slashSource('config set'), new TestFault())).toBe('config set:TestFault');
    });

    it('collapses parameterized component customIds to one key via the stable prefix', () => {
        const Pager = new CustomId('pager').int('page');
        const denial = new TestFault();

        const page1 = faultRouteKey(componentSource(Pager.encode({ page: 1 })), denial);
        const page2 = faultRouteKey(componentSource(Pager.encode({ page: 2 })), denial);

        expect(page1).toBe(page2);
        expect(page1).toContain('pager');
    });
});
