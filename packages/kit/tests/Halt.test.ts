import { describe, expect, it } from 'vitest';

import { Denial } from '@denials/Denial';
import { Halt } from '@src/Halt';

import type { ReplyResponse } from '@seedcord/types';

class NoopDenial extends Denial {
    constructor() {
        super('noop');
    }
    render(): ReplyResponse {
        return { kind: 'embed', embeds: [] };
    }
}

describe('Halt', () => {
    it('is an Error', () => {
        expect(new Halt()).toBeInstanceOf(Error);
    });

    it('is not a Denial, so the Denial branch never renders it', () => {
        expect(new Halt()).not.toBeInstanceOf(Denial);
        expect(new NoopDenial()).toBeInstanceOf(Denial);
    });

    it('carries no reason by default', () => {
        expect(new Halt().reason).toBeUndefined();
    });

    it('round-trips an optional reason', () => {
        expect(new Halt('blacklisted user').reason).toBe('blacklisted user');
    });
});
