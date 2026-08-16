import { afterEach, describe, expect, it, vi } from 'vitest';

import { ObjectConsoleSink } from '#src/ObjectConsoleSink';

import type { LogLevel, LogRecord } from '@seedcord/types';

function record(overrides: Partial<LogRecord>): LogRecord {
    return { level: 'info', message: '', label: 'X', channel: 'default', timestamp: 1, ...overrides };
}

const ESC = String.fromCharCode(27);

function capture(level: LogLevel = 'info'): { payload: () => Record<string, unknown> } {
    const method = level === 'debug' || level === 'trace' ? 'debug' : level;
    const spy = vi.spyOn(console, method).mockImplementation(() => undefined);
    return {
        // fixture cast: the sink makes one console call and passes the payload object as its first arg
        payload: () => spy.mock.calls[0]?.[0] as Record<string, unknown>
    };
}

afterEach(() => vi.restoreAllMocks());

describe('ObjectConsoleSink', () => {
    it('interpolates %s and %d into the message', () => {
        const cap = capture();
        new ObjectConsoleSink().onLog(record({ message: 'user %s scored %d', args: ['bob', 42] }));
        expect(cap.payload().message).toBe('user bob scored 42');
    });

    it('interpolates %f, %o, and the no-arg %%', () => {
        const cap = capture();
        new ObjectConsoleSink().onLog(record({ message: 'ratio %f obj %o pct %%', args: [0.5, { a: 1 }] }));
        expect(cap.payload().message).toBe('ratio 0.5 obj {"a":1} pct %');
    });

    it('keeps an array arg in the args field', () => {
        const cap = capture();
        new ObjectConsoleSink().onLog(record({ message: 'list', args: [[1, 2, 3]] }));
        expect(cap.payload().args).toEqual([[1, 2, 3]]);
    });

    it('merges a trailing object arg into top-level fields', () => {
        const cap = capture();
        new ObjectConsoleSink().onLog(record({ message: 'done', args: [{ userId: 5, guildId: 9 }] }));
        expect(cap.payload()).toMatchObject({ message: 'done', userId: 5, guildId: 9 });
    });

    it('serializes an Error arg to a plain shape', () => {
        const cap = capture('error');
        const err = new Error('boom');
        new ObjectConsoleSink().onLog(record({ level: 'error', message: 'failed', args: [err] }));
        const error = cap.payload().error as Record<string, unknown>;
        expect(error).toMatchObject({ name: 'Error', message: 'boom' });
        expect(typeof error.stack).toBe('string');
    });

    it('strips ANSI from the message and error shape (json is machine-read)', () => {
        const cap = capture('error');
        const err = new Error('bad request');
        err.name = `${ESC}[1m${ESC}[31mSeedcordError${ESC}[39m${ESC}[22m[123]`;
        err.stack = `${err.name}: bad request\n    at handler`;
        new ObjectConsoleSink().onLog(record({ level: 'error', message: `${ESC}[1mfailed${ESC}[22m`, args: [err] }));

        const payload = cap.payload();
        expect(JSON.stringify(payload)).not.toContain(ESC);
        expect(payload.message).toBe('failed');
        const error = payload.error as Record<string, unknown>;
        expect(error.name).toBe('SeedcordError[123]');
    });

    it('serializes the direct Error cause', () => {
        const cap = capture('error');
        const err = new Error('illegal ack', { cause: new Error('reply() acknowledged this interaction') });
        new ObjectConsoleSink().onLog(record({ level: 'error', message: 'boundary caught', args: [err] }));
        expect(cap.payload()).toMatchObject({
            error: { cause: { message: 'reply() acknowledged this interaction' } }
        });
    });

    it('serializes every aggregate member into an errors array', () => {
        const cap = capture('error');
        const err = new AggregateError([new Error('mongo closed'), new Error('pool stuck')], 'two failed');
        new ObjectConsoleSink().onLog(record({ level: 'error', message: 'shutdown caught', args: [err] }));
        expect(cap.payload()).toMatchObject({
            error: {
                message: 'two failed',
                errors: [{ message: 'mongo closed' }, { message: 'pool stuck' }]
            }
        });
    });

    it('caps the members it serializes', () => {
        const cap = capture('error');
        const many = Array.from({ length: 9 }, (_, i) => new Error(`boom ${i}`));
        new ObjectConsoleSink().onLog(
            record({ level: 'error', message: 'x', args: [new AggregateError(many, 'nine')] })
        );
        const error = cap.payload().error as { errors: unknown[]; omittedErrors: number };
        expect(error.errors).toHaveLength(5);
        expect(error.omittedErrors).toBe(4);
    });

    it('keeps leftover primitives in an args field', () => {
        const cap = capture();
        new ObjectConsoleSink().onLog(record({ message: 'note', args: ['tail', 7] }));
        expect(cap.payload().args).toEqual(['tail', 7]);
    });

    it('keeps every Error from a call with two, the first as error and the rest in args', () => {
        const cap = capture('error');
        const first = new Error('first boom');
        const second = new Error('second boom');
        new ObjectConsoleSink().onLog(record({ level: 'error', message: 'failed', args: [first, second] }));

        const payload = cap.payload();
        expect((payload.error as Record<string, unknown>).message).toBe('first boom');
        expect(JSON.stringify(payload)).toContain('second boom');
    });

    it('merges a plain object and serializes an Error from the same call', () => {
        const cap = capture('error');
        new ObjectConsoleSink().onLog(
            record({ level: 'error', message: 'both', args: [{ userId: 5 }, new Error('boom')] })
        );
        const payload = cap.payload();
        expect(payload.userId).toBe(5);
        expect((payload.error as Record<string, unknown>).message).toBe('boom');
    });

    it('carries the base record fields', () => {
        const cap = capture('warn');
        new ObjectConsoleSink().onLog(record({ level: 'warn', message: 'hi', label: 'Bot', channel: 'events' }));
        expect(cap.payload()).toMatchObject({ level: 'warn', label: 'Bot', channel: 'events' });
    });

    it('emits the record timestamp as an ISO string', () => {
        const cap = capture();
        const ts = 1_752_090_532_123;
        new ObjectConsoleSink().onLog(record({ message: 'stamped', timestamp: ts }));
        expect(cap.payload().timestamp).toBe(new Date(ts).toISOString());
    });

    it('survives a BigInt without throwing', () => {
        const cap = capture();
        expect(() => new ObjectConsoleSink().onLog(record({ message: 'big', args: [{ id: 10n }] }))).not.toThrow();
        expect(cap.payload().id).toBe('10');
    });

    it('survives a circular reference without throwing', () => {
        const cap = capture();
        const circular: Record<string, unknown> = { name: 'loop' };
        circular.self = circular;
        expect(() => new ObjectConsoleSink().onLog(record({ message: 'c', args: [circular] }))).not.toThrow();
        expect(cap.payload().name).toBe('loop');
    });

    it('routes each level to the matching console method', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

        const sink = new ObjectConsoleSink();
        sink.onLog(record({ level: 'error' }));
        sink.onLog(record({ level: 'warn' }));
        sink.onLog(record({ level: 'info' }));
        sink.onLog(record({ level: 'debug' }));
        sink.onLog(record({ level: 'trace' }));

        expect(error).toHaveBeenCalledOnce();
        expect(warn).toHaveBeenCalledOnce();
        expect(info).toHaveBeenCalledOnce();
        expect(debug).toHaveBeenCalledTimes(2);
    });
});
