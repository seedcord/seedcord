import { describe, expect, it } from 'vite-plus/test';

import { outcomeFor } from '#src/dispatch/outcomeFor';
import { Fault } from '#stops/Fault';
import { Notice } from '#stops/Notice';
import { Silence } from '#stops/Silence';

import type { ReplyResponse } from '@seedcord/types';

class Refusal extends Notice {
    constructor() {
        super('not allowed');
    }

    override render(): ReplyResponse {
        return { components: [] };
    }
}

describe('outcomeFor', () => {
    it('calls a Silence a refusal', () => {
        expect(outcomeFor(new Silence('blacklisted'))).toBe('refused');
    });

    it('calls a plain Notice a refusal since the user is meant to see it', () => {
        expect(outcomeFor(new Refusal())).toBe('refused');
    });

    it('calls a reporting Notice a failure', () => {
        const notice = new Refusal();
        notice.report = true;

        expect(outcomeFor(notice)).toBe('failed');
    });

    it('calls a Fault a failure since report defaults to true', () => {
        expect(outcomeFor(new Fault({ cause: new Error('db down') }))).toBe('failed');
    });

    it('calls a Fault built with report false a refusal', () => {
        expect(outcomeFor(new Fault({ report: false }))).toBe('refused');
    });

    it('calls a raw error a failure', () => {
        expect(outcomeFor(new Error('boom'))).toBe('failed');
        expect(outcomeFor('a thrown string')).toBe('failed');
    });
});
