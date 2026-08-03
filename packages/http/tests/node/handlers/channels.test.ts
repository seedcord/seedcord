import { LoggerChannelRegistry } from '@seedcord/logger';
import { beforeEach, describe, expect, it } from 'vitest';

import { AutocompleteHandler } from '@handlers/interaction/AutocompleteHandler';
import { SlashHandler } from '@handlers/interaction/SlashHandler';

import type { Core } from '@interfaces/Core';
import type { ILogSink, LogRecord } from '@seedcord/logger';
import type {
    APIApplicationCommandAutocompleteInteraction,
    APIChatInputApplicationCommandInteraction
} from 'discord-api-types/v10';

class FakeSink implements ILogSink {
    public readonly records: LogRecord[] = [];
    public readonly kind = 'console';
    public onLog(record: LogRecord): void {
        this.records.push(record);
    }
}

const registry = LoggerChannelRegistry.instance;
let sink: FakeSink;

beforeEach(() => {
    registry.reset();
    sink = new FakeSink();
    registry.configure({ level: 'trace', sinks: [sink] });
});

// justified: these bases read only the payload and the logger
const core = {} as Core;
const payload = { application_id: 'app-1', id: 'int-1', token: 'tok', type: 2 };

class Ban extends SlashHandler<never> {
    public execute(): Promise<void> {
        this.logger.info('ran');
        return Promise.resolve();
    }
}

class Suggest extends AutocompleteHandler<never> {
    public execute(): Promise<void> {
        this.logger.info('ran');
        return Promise.resolve();
    }
}

describe('http handler log channels', () => {
    it('puts both interaction bases on the interactions channel', async () => {
        // justified: the fixture carries only the fields these bases read
        await new Ban(payload as unknown as APIChatInputApplicationCommandInteraction, core).execute();
        await new Suggest(payload as unknown as APIApplicationCommandAutocompleteInteraction, core).execute();

        expect(sink.records.map((record) => record.channel)).toEqual(['interactions', 'interactions']);
    });
});
