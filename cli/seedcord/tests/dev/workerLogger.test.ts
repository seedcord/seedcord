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

    it('labels a line without the bot log marker as Vite', () => {
        workerLogger().info('Re-optimizing dependencies because vite config has changed');

        expect(records).toEqual([expect.objectContaining({ label: 'Vite', channel: 'default', level: 'info' })]);
    });

    it('logs a warnOnce message the first time only', () => {
        const logger = workerLogger();

        logger.warnOnce('Sourcemap points to missing source files');
        logger.warnOnce('Sourcemap points to missing source files');
        logger.warnOnce('a different warning');

        expect(records.map((record) => record.message)).toEqual([
            'Sourcemap points to missing source files',
            'a different warning'
        ]);
    });

    it('keeps the error passed to error()', () => {
        const error = new Error('transform failed');
        workerLogger().error('Pre-transform error', { error });
        expect(records).toEqual([expect.objectContaining({ level: 'error', args: [error] })]);
    });
});
