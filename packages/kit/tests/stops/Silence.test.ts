import { describe, expect, it } from 'vitest';

import { Denial } from '@stops/Denial';
import { Silence } from '@stops/Silence';

import type { ReplyResponse } from '@seedcord/types';

class NoopDenial extends Denial {
    constructor() {
        super('noop');
    }
    render(): ReplyResponse {
        return { kind: 'embed', embeds: [] };
    }
}

describe('Silence', () => {
    it('is an Error', () => {
        expect(new Silence()).toBeInstanceOf(Error);
    });

    it('is not a Denial, so the Denial branch never renders it', () => {
        expect(new Silence()).not.toBeInstanceOf(Denial);
        expect(new NoopDenial()).toBeInstanceOf(Denial);
    });

    it('carries no reason by default', () => {
        expect(new Silence().reason).toBeUndefined();
    });

    it('round-trips an optional reason', () => {
        expect(new Silence('blacklisted user').reason).toBe('blacklisted user');
    });
});
