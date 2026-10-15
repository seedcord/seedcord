import { Logger, LoggerChannelRegistry } from '@seedcord/logger';
import { Envapter, PortableSource } from 'envapt';
import { beforeEach, describe, expect, it } from 'vitest';

import { Seedcord } from '#src/edge/Seedcord';
import { registerBakedIds } from '#tests/helpers/bakedIds';
import { createSigner, signedRequest } from '#tests/helpers/ed25519';
import { VALID_TOKEN } from '#tests/helpers/fixtures';

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
Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: VALID_TOKEN }));

const registry = LoggerChannelRegistry.instance;
let sink: FakeSink;

function edgeConfig(logger?: LoggerConfig): HttpEdgeConfig {
    return {
        bot: { interactions: { path: null }, commands: { path: null } },
        subscribers: { path: null },
        ...(logger && { logger })
    };
}

// the bot applies config.logger when it starts, on its first POST
async function startBot(config: HttpEdgeConfig): Promise<void> {
    // @ts-expect-error singleton reset between bots
    Seedcord.reset();
    const signer = await createSigner();
    using _bakedIds = registerBakedIds({ publicKey: signer.publicKeyHex });
    await new Seedcord(config).fetch(await signedRequest(signer, '{"type":1}'));
}

beforeEach(() => {
    registry.reset();
    sink = new FakeSink();
});

describe('config.logger on an edge bot', () => {
    it('sends records to a sink the config names', async () => {
        await startBot(edgeConfig({ level: 'trace', sinks: [sink] }));

        new Logger('edge').info('hello');

        expect(sink.records.map((record) => record.message)).toContain('hello');
    });

    it('keeps a record below the configured level out of the sink', async () => {
        await startBot(edgeConfig({ level: 'error', sinks: [sink] }));
        const logger = new Logger('edge');

        logger.info('quiet');
        logger.error('loud');

        const messages = sink.records.map((record) => record.message);
        expect(messages).toContain('loud');
        expect(messages).not.toContain('quiet');
    });

    it('goes back to the default sink when a later bot omits logger', async () => {
        await startBot(edgeConfig({ level: 'trace', sinks: [sink] }));
        await startBot(edgeConfig());

        new Logger('edge').info('after');

        expect(sink.records.map((record) => record.message)).not.toContain('after');
    });
});
