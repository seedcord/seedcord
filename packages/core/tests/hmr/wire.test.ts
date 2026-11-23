import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { describe, expect, it } from 'vite-plus/test';

import { fromDevLogLine, fromWireError, toDevLogLine, toWireError } from '#hmr/wire';

import type { LogRecord } from '@seedcord/types';

// vite's dev channel sends JSON between the worker and the CLI
function overTheWire<Wire>(wire: Wire): Wire {
    // eslint-disable-next-line unicorn/prefer-structured-clone -- structuredClone keeps values JSON would not
    return JSON.parse(JSON.stringify(wire)) as Wire;
}

function record(args: unknown[]): LogRecord {
    return { level: 'error', message: 'deploy failed', label: 'Commands', channel: 'commands', timestamp: 1, args };
}

describe('wire errors', () => {
    it('keeps the name, message, stack, and code', () => {
        const sent = new SeedcordError(SeedcordErrorCode.ConfigMissingEnv, ['DISCORD_BOT_TOKEN']);

        const received = fromWireError(overTheWire(toWireError(sent)));

        expect(received).toMatchObject({ name: sent.name, message: sent.message, stack: sent.stack });
        expect(received).toHaveProperty('code', SeedcordErrorCode.ConfigMissingEnv);
    });

    it('keeps the error a wrapper was built from', () => {
        const discord = new Error('Missing Access');
        const sent = new SeedcordError(SeedcordErrorCode.CoreCommandGuildDeployFailed, ['111', discord.message], {
            cause: discord
        });

        const received = fromWireError(overTheWire(toWireError(sent)));

        expect(received.cause).toMatchObject({ message: 'Missing Access' });
        expect(Error.isError(received.cause)).toBe(true);
    });

    it('keeps every member of an aggregate error', () => {
        const sent = new AggregateError([new Error('port taken'), new Error('token revoked')], 'Phase Ready failed');

        const received = fromWireError(overTheWire(toWireError(sent)));

        expect(received).toBeInstanceOf(AggregateError);
        expect((received as AggregateError).errors.map((member: Error) => member.message)).toEqual([
            'port taken',
            'token revoked'
        ]);
    });

    it('ends the chain at an aggregate that lists itself', () => {
        const looped = new AggregateError([new Error('port taken')], 'Phase Ready failed');
        looped.errors.push(looped);

        const received = fromWireError(overTheWire(toWireError(looped)));

        expect((received as AggregateError).errors.map((member: Error) => member.message)).toEqual(['port taken']);
    });

    it('sends a thrown string as an error with that message', () => {
        expect(fromWireError(overTheWire(toWireError('timeout')))).toMatchObject({ message: 'timeout' });
    });

    it('ends the chain at a cause that is not an error', () => {
        const received = fromWireError(overTheWire(toWireError(new Error('request failed', { cause: 'timeout' }))));

        expect(received.cause).toMatchObject({ message: 'timeout' });
    });

    it('ends the chain at a cause it already sent', () => {
        const looped = new Error('looped');
        looped.cause = looped;

        const received = fromWireError(overTheWire(toWireError(looped)));

        expect(received).toMatchObject({ message: 'looped' });
    });
});

describe('wire logs', () => {
    it('reads a record back out of its console line, with an Error arg as an Error', () => {
        const sent = record([new SeedcordError(SeedcordErrorCode.ConfigMissingEnv, ['DISCORD_BOT_TOKEN'])]);

        const received = fromDevLogLine(toDevLogLine(sent));

        expect(received).toMatchObject({ level: 'error', message: 'deploy failed', label: 'Commands', timestamp: 1 });
        expect(Error.isError(received?.args?.[0])).toBe(true);
        expect(received?.args?.[0]).toHaveProperty('code', SeedcordErrorCode.ConfigMissingEnv);
    });

    it("leaves a console line the bot's own code wrote alone", () => {
        expect(fromDevLogLine('counter ready')).toBeUndefined();
        expect(fromDevLogLine('seedcord:log is starting')).toBeUndefined();
    });

    it.each([
        ['an unknown level', { level: 'loud' }],
        ['args that are not a list', { args: 5 }],
        ['an arg that is not an object', { args: [5] }],
        ['an arg with neither value nor error', { args: [{ other: 1 }] }],
        ['a null error arg', { args: [{ error: null }] }],
        ['an error arg that is not an object', { args: [{ error: 5 }] }],
        ['an error arg without a message', { args: [{ error: { name: 'Error' } }] }],
        ['an error arg with a cause that is not an error', { args: [{ error: { name: 'E', message: 'x', cause: 5 } }] }]
    ])('leaves a marked line with %s alone', (_, broken) => {
        const line = `seedcord:log ${JSON.stringify({ ...record([]), ...broken })}`;

        expect(fromDevLogLine(line)).toBeUndefined();
    });

    it('sends an arg JSON cannot hold as the text console.log prints for it', () => {
        function wave(): void {}
        class Ticket {
            public readonly id = 1;
        }

        const received = fromDevLogLine(
            toDevLogLine(record([undefined, Symbol('id'), wave, () => undefined, Ticket, 5n]))
        );

        expect(received?.args).toEqual([
            'undefined',
            'Symbol(id)',
            '[Function: wave]',
            '[Function (anonymous)]',
            '[class Ticket]',
            '5n'
        ]);
    });

    it("sends async functions, generators and subclasses as node's console.log text", () => {
        class Ticket {
            public readonly id = 1;
        }
        class VipTicket extends Ticket {}
        async function load(): Promise<void> {}
        function* pages(): Generator<number> {}
        async function* stream(): AsyncGenerator<number> {}

        const received = fromDevLogLine(
            toDevLogLine(
                record([
                    load,
                    pages,
                    stream,
                    VipTicket,
                    async () => {
                        await load();
                    },
                    class extends Ticket {}
                ])
            )
        );

        expect(received?.args).toEqual([
            '[AsyncFunction: load]',
            '[GeneratorFunction: pages]',
            '[AsyncGeneratorFunction: stream]',
            '[class VipTicket extends Ticket]',
            '[AsyncFunction (anonymous)]',
            '[class (anonymous) extends Ticket]'
        ]);
    });

    it("sends a function with a null prototype as node's console.log text", () => {
        function bare(): void {}
        Object.setPrototypeOf(bare, null);

        const received = fromDevLogLine(toDevLogLine(record([bare])));

        expect(received?.args).toEqual(['[Function (null prototype): bare]']);
    });

    it('sends a circular arg with the loop cut', () => {
        const guild: Record<string, unknown> = { id: '1' };
        guild.self = guild;

        const received = fromDevLogLine(toDevLogLine(record([guild])));

        expect(received?.args).toEqual([{ id: '1', self: '[Circular]' }]);
    });
});
