import { LoggerChannelRegistry } from '@seedcord/logger';
import { describe, expect, it } from 'vitest';

import { DispatchContext } from '#src/dispatch/DispatchContext';
import { reportFault } from '#src/notices/reportFault';
import { Fault } from '#stops/Fault';
import { Bus } from '#subscribers/Bus';
import { TestNotice } from '#tests/utils/TestNotice';

import type { CoreBase } from '#interfaces/CoreBase';
import type { FaultReport } from '#src/notices/reportFault';
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

// reports a fault through a real bus and returns every payload it published, keyed by event
function published(error: Error, report: FaultReport): [string, unknown][] {
    // justified: the Bus only stores core, no member is read during publish
    const bus = new Bus({} as unknown as CoreBase);
    const seen: [string, unknown][] = [];
    bus.on('handledException', (payload) => seen.push(['handledException', payload]));
    bus.on('unknownException', (payload) => seen.push(['unknownException', payload]));
    reportFault(bus, undefined, error, report);
    return seen;
}

describe('reportFault', () => {
    it('publishes handledException for a reporting Notice that has a source', () => {
        const denial = new Fault({ cause: new Error('write failed') });

        expect(published(denial, reportWith())).toEqual([
            ['handledException', expect.objectContaining({ denial, uuid, source })]
        ]);
    });

    it('publishes unknownException for a reporting Notice without a source', () => {
        const denial = new Fault({ cause: new Error('lookup failed') });

        expect(published(denial, reportWith({ source: null }))).toEqual([
            ['unknownException', expect.objectContaining({ error: denial, uuid })]
        ]);
    });

    it('publishes unknownException for a raw throw and logs its stack', () => {
        const logged: LogRecord[] = [];
        using _capture = LoggerChannelRegistry.instance.installSink({ kind: 'capture', onLog: (r) => logged.push(r) });
        const thrown = new Error('a bug');

        expect(published(thrown, reportWith())).toEqual([
            ['unknownException', expect.objectContaining({ error: thrown, uuid })]
        ]);
        expect(logged.at(-1)?.args).toEqual([thrown]);
    });

    it('publishes nothing for a Notice that does not report', () => {
        expect(published(new TestNotice(), reportWith())).toEqual([]);
    });
});
