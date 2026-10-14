import { LoggerChannelRegistry } from '@seedcord/logger';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { workerLogger } from '#commands/dev/runtime/workerLogger';

import type { LogRecord, LogSinkHandle } from '@seedcord/types';

describe('workerLogger', () => {
    let records: LogRecord[];
    let sink: LogSinkHandle;

    beforeEach(() => {
        records = [];
        sink = LoggerChannelRegistry.instance.installSink(
            { kind: 'capture', onLog: (record) => records.push(record) },
            { muteConsole: true }
        );
    });

    afterEach(() => sink.dispose());

    it('keeps the error passed to error()', () => {
        const error = new Error('transform failed');
        workerLogger().error('Pre-transform error', { error });
        expect(records).toEqual([expect.objectContaining({ level: 'error', args: [error] })]);
    });
});
