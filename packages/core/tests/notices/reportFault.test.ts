import { LoggerChannelRegistry } from '@seedcord/logger';
import { describe, expect, it, vi } from 'vitest';

import { DispatchContext } from '#src/dispatch/DispatchContext';
import { reportFault } from '#src/notices/reportFault';
import { Fault } from '#stops/Fault';
import { PublishDefault } from '#subscribers/publishDefault';
import { TestNotice } from '#tests/utils/TestNotice';

import type { FaultReport } from '#src/notices/reportFault';
import type { Bus } from '#subscribers/Bus';
import type { FaultSource } from '#subscribers/types/Subscriptions';
import type { LogRecord } from '@seedcord/types';

const uuid = '11111111-2222-3333-4444-555555555555';
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

function reportWith(fields: Partial<FaultReport> = {}): FaultReport {
    return {
        uuid,
        dispatch: new DispatchContext('slash', 'ban'),
        origin: 'slash:ban',
        source,
        guild: undefined,
        user: undefined,
        metadata: {},
        ...fields
    };
}

function busWith(publish: ReturnType<typeof vi.fn>): Bus {
    // justified: reportFault only publishes through the bus
    return { [PublishDefault]: publish } as unknown as Bus;
}

describe('reportFault', () => {
    it('publishes handledException for a reporting Notice that has a source', () => {
        const publish = vi.fn();
        const denial = new Fault({ cause: new Error('write failed') });

        reportFault(busWith(publish), undefined, denial, reportWith());

        expect(publish).toHaveBeenCalledWith('handledException', expect.objectContaining({ denial, uuid, source }));
    });

    it('publishes unknownException for a reporting Notice without a source', () => {
        const publish = vi.fn();
        const denial = new Fault({ cause: new Error('lookup failed') });

        reportFault(busWith(publish), undefined, denial, reportWith({ source: null }));

        expect(publish).toHaveBeenCalledWith('unknownException', expect.objectContaining({ error: denial, uuid }));
    });

    it('publishes unknownException for a raw throw and logs its stack', () => {
        const publish = vi.fn();
        const logged: LogRecord[] = [];
        using _capture = LoggerChannelRegistry.instance.installSink({ kind: 'capture', onLog: (r) => logged.push(r) });
        const thrown = new Error('a bug');

        reportFault(busWith(publish), undefined, thrown, reportWith());

        expect(publish).toHaveBeenCalledWith('unknownException', expect.objectContaining({ error: thrown, uuid }));
        expect(logged.at(-1)?.args).toEqual([thrown]);
    });

    it('publishes nothing for a Notice that does not report', () => {
        const publish = vi.fn();

        reportFault(busWith(publish), undefined, new TestNotice(), reportWith());

        expect(publish).not.toHaveBeenCalled();
    });
});
