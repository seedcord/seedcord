import { Logger, LoggerChannelRegistry } from '@seedcord/logger';
import { Envapter, PortableSource } from 'envapt';
import { beforeEach, describe, expect, it } from 'vitest';

import { createSeedcord } from '#src/createSeedcord';

import { emptyManifest, VALID_TOKEN } from '../helpers/fixtures';

import type { HttpEdgeConfig } from '#src/interfaces/Config';
import type { ILogSink, LogRecord, LoggerConfig } from '@seedcord/types';

class FakeSink implements ILogSink {
    public readonly records: LogRecord[] = [];
    public readonly kind = 'console';
    public onLog(record: LogRecord): void {
        this.records.push(record);
    }
}

// the registry reads the environment on first touch to pick its default level
Envapter.useSource(new PortableSource({ DISCORD_PUBLIC_KEY: 'a'.repeat(64), DISCORD_BOT_TOKEN: VALID_TOKEN }));

const registry = LoggerChannelRegistry.instance;
let sink: FakeSink;

function edgeConfig(logger?: LoggerConfig): HttpEdgeConfig {
    return {
        runtime: 'edge',
        bot: { interactions: { path: null }, commands: { path: null } },
        subscribers: { path: null },
        ...(logger && { logger })
    };
}

beforeEach(() => {
    registry.reset();
    sink = new FakeSink();
});

describe('config.logger on an edge bot', () => {
    it('sends records to a sink the config names', () => {
        createSeedcord(edgeConfig({ level: 'trace', sinks: [sink] }), emptyManifest());

        new Logger('edge').info('hello');

        expect(sink.records.map((record) => record.message)).toContain('hello');
    });

    it('drops a record under the level the config sets', () => {
        createSeedcord(edgeConfig({ level: 'error', sinks: [sink] }), emptyManifest());
        const logger = new Logger('edge');

        logger.info('quiet');
        logger.error('loud');

        const messages = sink.records.map((record) => record.message);
        expect(messages).toContain('loud');
        expect(messages).not.toContain('quiet');
    });

    it('goes back to the default sink when a later bot omits logger', () => {
        createSeedcord(edgeConfig({ level: 'trace', sinks: [sink] }), emptyManifest());
        createSeedcord(edgeConfig(), emptyManifest());

        new Logger('edge').info('after');

        expect(sink.records.map((record) => record.message)).not.toContain('after');
    });
});
