import { describe, expect, it } from 'vitest';

import { Notice } from '#stops/Notice';
import { Silence } from '#stops/Silence';

import type { ReplyResponse } from '@seedcord/types';

class NoopDenial extends Notice {
    constructor() {
        super('noop');
    }
    render(): ReplyResponse {
        return { components: [] };
    }
}

describe('Silence', () => {
    it('is an Error', () => {
        expect(new Silence()).toBeInstanceOf(Error);
    });

    it('is not a Notice, so the Notice branch never renders it', () => {
        expect(new Silence()).not.toBeInstanceOf(Notice);
        expect(new NoopDenial()).toBeInstanceOf(Notice);
    });

    it('carries no reason by default', () => {
        expect(new Silence().reason).toBeUndefined();
    });

    it('round-trips an optional reason', () => {
        expect(new Silence('blacklisted user').reason).toBe('blacklisted user');
    });
});
