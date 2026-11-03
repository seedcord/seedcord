import { Logger, LoggerChannelRegistry } from '@seedcord/logger';
import { RESTJSONErrorCodes } from 'discord-api-types/v10';
import { afterEach, describe, expect, it, vi, type Mock } from 'vite-plus/test';

import { DispatchContext } from '#src/dispatch/DispatchContext';
import { InteractionKind } from '#src/metadataKeys';
import { FaultBoundary } from '#src/notices/FaultBoundary';
import { Fault } from '#stops/Fault';
import { Notice } from '#stops/Notice';
import { Silence } from '#stops/Silence';
import { busWith } from '#tests/utils/busWith';
import { TestNotice } from '#tests/utils/TestNotice';

import type { CoreBase } from '#interfaces/CoreBase';
import type { FaultDetails, FaultSender } from '#src/notices/FaultBoundary';
import type { FaultSource } from '#subscribers/types/Subscriptions';
import type { Config, LogRecord, RenderContext, ReplyResponse } from '@seedcord/types';

class FakeApiError extends Error {
    constructor(public readonly code: number) {
        super(`api ${code}`);
    }
}

const source: FaultSource = {
    kind: 'interaction',
    interactionKind: 'slash',
    command: 'ban',
    customId: null,
    userId: 'u1',
    guildId: null,
    channelId: null,
    interactionId: 'i1',
    raw: {}
};

const dispatch = new DispatchContext(InteractionKind.Slash, 'ban');

interface PublishedFault {
    event: string;
    error: Error;
}

interface Harness {
    boundary: FaultBoundary;
    published: PublishedFault[];
    send: Mock<FaultSender['send']>;
}

function harness(errors: NonNullable<Config['errors']> = {}, details: Partial<FaultDetails> = {}): Harness {
    const bus = busWith();
    const published: PublishedFault[] = [];
    bus.on('handledException', ({ denial }) => published.push({ event: 'handledException', error: denial }));
    bus.on('unknownException', ({ error }) => published.push({ event: 'unknownException', error }));
    // justified: the boundary reads only core.bus and core.config
    const core = { bus, config: { errors } } as unknown as CoreBase;
    const detailsOf = (): FaultDetails => ({
        origin: 'slash:ban',
        source,
        guild: undefined,
        user: undefined,
        metadata: {},
        ...details
    });
    return {
        boundary: new FaultBoundary(core, errors.ignoreApiCodes, FakeApiError, dispatch, detailsOf),
        published,
        send: vi.fn<FaultSender['send']>().mockResolvedValue(undefined)
    };
}

const card = { components: [] };

class CustomCard extends Fault {
    constructor(_uuid: RenderContext['uuid']) {
        super();
    }

    override render(): ReplyResponse {
        return card;
    }
}

class BrokenCard extends Fault {
    constructor(_uuid: RenderContext['uuid']) {
        super();
    }

    override render(): ReplyResponse {
        throw new Error('card exploded');
    }
}

class ExplodingNotice extends Notice {
    constructor() {
        super('refused');
    }

    override render(): ReplyResponse {
        throw new Error('render exploded');
    }
}

function logCapture(level: LogRecord['level']): { lines: LogRecord[] } & Disposable {
    const lines: LogRecord[] = [];
    const sink = LoggerChannelRegistry.instance.installSink({
        kind: 'capture',
        onLog: (record) => {
            if (record.level === level) lines.push(record);
        }
    });
    return { lines, [Symbol.dispose]: () => sink[Symbol.dispose]() };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('FaultBoundary', () => {
    describe('report', () => {
        it('publishes handledException for a reporting Notice that has a source', () => {
            const { boundary, published } = harness();
            const denial = new Fault({ cause: new Error('write failed') });

            boundary.report(denial);

            expect(published).toEqual([{ event: 'handledException', error: denial }]);
        });

        it('publishes unknownException for a reporting Notice without a source', () => {
            const { boundary, published } = harness({}, { source: null });
            const denial = new Fault({ cause: new Error('lookup failed') });

            boundary.report(denial);

            expect(published).toEqual([{ event: 'unknownException', error: denial }]);
        });

        it('publishes unknownException for a raw throw and logs its stack', () => {
            const { boundary, published } = harness();
            using log = logCapture('error');
            const thrown = new Error('a bug');

            boundary.report(thrown);

            expect(published).toEqual([{ event: 'unknownException', error: thrown }]);
            expect(log.lines.at(-1)?.args).toEqual([thrown]);
        });

        it('publishes nothing for a Notice that does not report', () => {
            const { boundary, published } = harness();

            boundary.report(new TestNotice());

            expect(published).toEqual([]);
        });

        it('wraps a non-Error throw', () => {
            const { boundary, published } = harness();

            boundary.report('a thrown string');

            expect(published).toMatchObject([{ event: 'unknownException', error: { message: 'a thrown string' } }]);
        });

        it('returns null for a Silence and logs its reason only when logSilences allows it', () => {
            const debug = vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
            const on = harness();
            const off = harness({ logSilences: false });

            expect(on.boundary.report(new Silence('first'))).toBeNull();
            expect(off.boundary.report(new Silence('second'))).toBeNull();

            expect(debug).toHaveBeenCalledWith('Silence: first');
            expect(debug).not.toHaveBeenCalledWith('Silence: second');
            expect(on.published).toEqual([]);
        });

        it('returns null for an ignored api code and reports any other', () => {
            const { boundary, published } = harness({ ignoreApiCodes: [10_008] });

            expect(boundary.report(new FakeApiError(10_008))).toBeNull();
            expect(published).toEqual([]);

            expect(boundary.report(new FakeApiError(10_009))).not.toBeNull();
            expect(published).toHaveLength(1);
        });
    });

    describe('answerWithReply', () => {
        it('sends nothing for a Silence', async () => {
            const { boundary, send } = harness();

            await boundary.answerWithReply(new Silence(), { send });

            expect(send).not.toHaveBeenCalled();
        });

        it('sends a raw fault ephemerally and a Notice by its own setting', async () => {
            const { boundary, send } = harness();
            const notice = new TestNotice();
            notice.ephemeral = false;

            await boundary.answerWithReply(new Error('boom'), { send });
            await boundary.answerWithReply(notice, { send });

            expect(send.mock.calls.map((call) => call[1])).toEqual([{ ephemeral: true }, { ephemeral: false }]);
        });

        it('renders a Notice against this dispatch', async () => {
            const { boundary, send } = harness();
            let saw: unknown;
            class ReadingNotice extends Notice {
                constructor() {
                    super('reads the bag');
                }

                override render(ctx: RenderContext): ReplyResponse {
                    saw = ctx.dispatch;
                    return { components: [] };
                }
            }

            await boundary.answerWithReply(new ReadingNotice(), { send });

            expect(saw).toBe(dispatch);
        });

        it('renders the defaultError override for a raw fault', async () => {
            const { boundary, send } = harness({ defaultError: CustomCard });

            await boundary.answerWithReply(new Error('boom'), { send });

            expect(send).toHaveBeenCalledWith(card, { ephemeral: true });
        });

        it('sends the default card and reports the render error when a Notice render throws', async () => {
            const { boundary, published, send } = harness({ defaultError: CustomCard });

            await boundary.answerWithReply(new ExplodingNotice(), { send });

            expect(send).toHaveBeenCalledWith(card, { ephemeral: true });
            expect(published).toMatchObject([{ event: 'unknownException', error: { message: 'render exploded' } }]);
        });

        it('logs the error and sends the built-in Fault card when the defaultError render throws too', async () => {
            const { boundary, send } = harness({ defaultError: BrokenCard });
            using log = logCapture('error');

            await boundary.answerWithReply(new Error('boom'), { send });

            expect(send).toHaveBeenCalledWith(expect.objectContaining({ components: expect.any(Array) as unknown }), {
                ephemeral: true
            });
            expect(log.lines.flatMap((line) => line.args ?? [])).toContainEqual(
                expect.objectContaining({ message: 'card exploded' })
            );
        });

        it.each([
            { failure: new Error('network down'), reported: true },
            { failure: new FakeApiError(RESTJSONErrorCodes.UnknownInteraction), reported: false }
        ])('logs a send failure only when it is unexpected ($reported)', async ({ failure, reported }) => {
            const { boundary, send } = harness();
            send.mockRejectedValueOnce(failure);
            using log = logCapture('error');

            await boundary.answerWithReply(new TestNotice(), { send });

            expect(log.lines.flatMap((line) => line.args ?? []).includes(failure)).toBe(reported);
        });
    });

    describe('answerWithEmptyChoices', () => {
        it('clears the choices and reports the fault', async () => {
            const { boundary, published } = harness();
            const clearChoices = vi.fn().mockResolvedValue(undefined);

            await boundary.answerWithEmptyChoices(new Error('boom'), clearChoices);

            expect(clearChoices).toHaveBeenCalledOnce();
            expect(published).toHaveLength(1);
        });

        it('clears the choices for a Silence too, without rendering', async () => {
            const { boundary } = harness();
            const clearChoices = vi.fn().mockResolvedValue(undefined);

            await boundary.answerWithEmptyChoices(new Silence(), clearChoices);
            await boundary.answerWithEmptyChoices(new ExplodingNotice(), clearChoices);

            expect(clearChoices).toHaveBeenCalledTimes(2);
        });
    });
});
