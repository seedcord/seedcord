import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { checkAckLegality, sendTarget } from '#reply/ackLegality';
import { AckTrace } from '#reply/AckTrace';

import { stripAnsi } from './helpers';

import type { AckState, ReplyMethod } from '#reply/ackLegality';

const ROUTE = 'slash:ban';

const LEGAL: Record<AckState, ReplyMethod[]> = {
    unacked: ['reply', 'defer', 'deferUpdate', 'update', 'send', 'showModal'],
    'deferred-reply': ['followUp', 'edit', 'delete', 'send'],
    'deferred-update': ['update', 'followUp', 'edit', 'delete', 'send'],
    replied: ['followUp', 'edit', 'delete', 'send']
};

const ALL_METHODS: ReplyMethod[] = [
    'reply',
    'defer',
    'deferUpdate',
    'update',
    'followUp',
    'edit',
    'delete',
    'send',
    'showModal'
];

function captureMessage(method: ReplyMethod, state: AckState): string {
    try {
        checkAckLegality(method, state, ROUTE);
    } catch (error) {
        if (!isSeedcordError(error)) throw error;
        return stripAnsi(error.message);
    }
    throw new Error(`${method} in ${state} did not throw`);
}

describe('checkAckLegality', () => {
    for (const state of Object.keys(LEGAL) as AckState[]) {
        for (const method of ALL_METHODS) {
            const legal = LEGAL[state].includes(method);
            it(`${legal ? 'permits' : 'rejects'} ${method} in ${state}`, () => {
                if (legal) {
                    expect(() => checkAckLegality(method, state, ROUTE)).not.toThrow();
                } else {
                    try {
                        checkAckLegality(method, state, ROUTE);
                        expect.unreachable(`${method} in ${state} should throw`);
                    } catch (error) {
                        expect(isSeedcordError(error, undefined, SeedcordErrorCode.ReplyIllegalAckState)).toBe(true);
                    }
                }
            });
        }
    }

    it('names the illegal method and the route in the message', () => {
        const message = captureMessage('reply', 'replied');
        expect(message).toContain('reply()');
        expect(message).toContain(ROUTE);
    });

    it('suggests followUp and edit when reply is called after replying', () => {
        const message = captureMessage('reply', 'replied');
        expect(message).toContain('followUp()');
        expect(message).toContain('edit()');
    });

    it('suggests edit and followUp when reply is called after a deferred reply', () => {
        const message = captureMessage('reply', 'deferred-reply');
        expect(message).toContain('edit()');
        expect(message).toContain('followUp()');
    });

    it('suggests only followUp when reply is called after a deferred update', () => {
        const message = captureMessage('reply', 'deferred-update');
        expect(message).toContain('followUp()');
        expect(message).not.toContain('edit()');
    });

    it('points update after a deferred reply at the placeholder via edit', () => {
        const message = captureMessage('update', 'deferred-reply');
        expect(message).toContain('edit()');
    });

    it('suggests edit and followUp when update is called after a reply', () => {
        const message = captureMessage('update', 'replied');
        expect(message).toContain('update() rewrites a source message. Use edit() or followUp() instead.');
    });

    it('suggests only the universal ack methods when followUp is called before any ack', () => {
        const message = captureMessage('followUp', 'unacked');
        expect(message).toContain('Ack first with reply() or defer().');
    });

    it('names the deferral rule for the whole defer family', () => {
        const message = captureMessage('defer', 'replied');
        expect(message).toContain('A deferral can only be the initial response.');
    });

    it('says nothing was sent when edit is called before any ack', () => {
        const message = captureMessage('edit', 'unacked');
        expect(message.toLowerCase()).toContain('nothing');
    });

    it('points delete before any ack at acknowledging first', () => {
        const message = captureMessage('delete', 'unacked');
        expect(message).toContain('delete()');
        expect(message).toContain('reply()');
        expect(message).toContain('defer()');
    });

    it('sets the passed ackedBy error as the throw cause', () => {
        const ackedBy = new AckTrace('reply');
        try {
            checkAckLegality('reply', 'replied', ROUTE, ackedBy);
            expect.unreachable('reply in replied should throw');
        } catch (error) {
            if (!isSeedcordError(error)) throw error;
            expect(error.cause).toBe(ackedBy);
        }
    });

    it('leaves the cause absent when no ackedBy is passed', () => {
        try {
            checkAckLegality('reply', 'replied', ROUTE);
            expect.unreachable('reply in replied should throw');
        } catch (error) {
            if (!isSeedcordError(error)) throw error;
            expect(error.cause).toBeUndefined();
        }
    });
});

describe('sendTarget', () => {
    it('maps each ack state to its concrete dispatch method', () => {
        expect(sendTarget('unacked')).toBe('reply');
        expect(sendTarget('deferred-reply')).toBe('edit');
        expect(sendTarget('deferred-update')).toBe('followUp');
        expect(sendTarget('replied')).toBe('followUp');
    });
});
