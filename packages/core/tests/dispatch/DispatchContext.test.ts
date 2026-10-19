import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, it, expect } from 'vite-plus/test';

import { DispatchContext } from '#src/dispatch/DispatchContext';

interface LooseBag {
    set(key: string, value: unknown): void;
    get(key: string): unknown;
    require(key: string): unknown;
}

// this cast stands in for the plugin declaration merge that fills DispatchState
function bagOf(ctx: DispatchContext): LooseBag {
    return ctx;
}

describe('DispatchContext', () => {
    it('round-trips a value through set and get', () => {
        const bag = bagOf(new DispatchContext('slash:test'));
        bag.set('locale', 'en');
        expect(bag.get('locale')).toBe('en');
    });

    it('returns a set value through require', () => {
        const bag = bagOf(new DispatchContext('slash:test'));
        bag.set('locale', 'en');
        expect(bag.require('locale')).toBe('en');
    });

    it('throws DispatchStateMissing when nothing set the key', () => {
        const bag = bagOf(new DispatchContext('slash:test'));
        expect(() => bag.require('locale')).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.DispatchStateMissing })
        );
    });

    it('names the missing key in the message', () => {
        const bag = bagOf(new DispatchContext('slash:test'));
        expect(() => bag.require('locale')).toThrow(/locale/);
    });

    it('returns a key set to null', () => {
        const bag = bagOf(new DispatchContext('slash:test'));
        bag.set('locale', null);
        expect(bag.require('locale')).toBeNull();
    });

    it('treats a key set to undefined as missing', () => {
        const bag = bagOf(new DispatchContext('slash:test'));
        bag.set('locale', undefined);
        expect(() => bag.require('locale')).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.DispatchStateMissing })
        );
    });

    it.each(['constructor', 'toString', 'valueOf', 'hasOwnProperty'])('treats %s as missing', (key) => {
        const bag = bagOf(new DispatchContext('slash:test'));
        expect(() => bag.require(key)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.DispatchStateMissing })
        );
    });

    it('stores __proto__ as a value', () => {
        const bag = bagOf(new DispatchContext('slash:test'));
        bag.set('__proto__', 'en');
        expect(bag.require('__proto__')).toBe('en');
    });

    it('gives every dispatch its own id', () => {
        const first = new DispatchContext('slash:test');
        const second = new DispatchContext('slash:test');

        expect(first.id).not.toBe(second.id);
        expect(first.id).toBe(first.id);
    });
});
