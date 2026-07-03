import '../utils/mock-env';

import { Notice } from '@seedcord/core';
import { describe, expect, it } from 'vitest';

import { causeStack, faultSummary } from '@subscribers/default/HandledException';

import type { ReplyResponse } from '@seedcord/types';
import type { EventFaultSource, InteractionFaultSource } from '@subscribers/types/Subscriptions';

class TestFault extends Notice {
    constructor(message = 'boom', cause?: unknown) {
        super(message, cause === undefined ? undefined : { cause });
    }
    render(): ReplyResponse {
        return { components: [] };
    }
}

const interactionSource: InteractionFaultSource = {
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

const eventSource: EventFaultSource = {
    kind: 'event',
    eventName: 'messageCreate',
    handler: 'Starboard',
    userId: null,
    guildId: 'g1',
    channelId: null,
    raw: []
};

describe('faultSummary', () => {
    it('renders the command and customId for an interaction source', () => {
        const summary = faultSummary(new TestFault(), interactionSource);
        expect(summary).toContain('**Command:** ban');
        expect(summary).toContain('**Interaction ID:** `i1`');
        expect(summary).not.toContain('**Event:**');
    });

    it('renders the event name and handler for an event source, with nullable fallbacks', () => {
        const summary = faultSummary(new TestFault(), eventSource);
        expect(summary).toContain('**Event:** messageCreate');
        expect(summary).toContain('**Handler:** Starboard');
        expect(summary).toContain('**User ID:** `n/a`');
        expect(summary).toContain('**Channel ID:** `n/a`');
        expect(summary).not.toContain('**Interaction ID:**');
    });
});

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
