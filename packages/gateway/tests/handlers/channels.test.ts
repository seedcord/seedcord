import { LoggerChannelRegistry } from '@seedcord/logger';
import { beforeEach, describe, expect, it } from 'vitest';

import { EventHandler } from '#handlers/event/EventHandler';
import { EventMiddleware } from '#handlers/event/EventMiddleware';
import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { InteractionMiddleware } from '#handlers/interaction/InteractionMiddleware';
import { SlashHandler } from '#handlers/interaction/SlashHandler';

import { mockInteraction } from '../utils/senderMock';

import type { Core } from '#interfaces/Core';
import type { ILogSink, LogRecord } from '@seedcord/types';
import type { AutocompleteInteraction, ChatInputCommandInteraction, ClientEvents } from 'discord.js';

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
const messagePayload = [] as unknown as ClientEvents['messageCreate'];

class Greet extends EventHandler<'messageCreate'> {
    public execute(): Promise<void> {
        this.logger.info('ran');
        return Promise.resolve();
    }
}

class Filter extends EventMiddleware<'messageCreate'> {
    public execute(): Promise<void> {
        this.logger.info('ran');
        return Promise.resolve();
    }
}

class Guard extends InteractionMiddleware<ChatInputCommandInteraction<'cached'>> {
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

class Ban extends SlashHandler<never> {
    public execute(): Promise<void> {
        this.logger.info('ran');
        return Promise.resolve();
    }
}

describe('gateway handler log channels', () => {
    it('puts both event bases on the events channel', async () => {
        await new Greet(messagePayload, core).execute();
        await new Filter(messagePayload, core).execute();

        expect(sink.records.map((record) => record.channel)).toEqual(['events', 'events']);
    });

    it('puts the interaction bases on the interactions channel', async () => {
        // justified: the fixture implements only the interaction surface these bases read
        const interaction = mockInteraction();

        await new Guard(interaction as unknown as ChatInputCommandInteraction<'cached'>, core).execute();
        await new Suggest(interaction as unknown as AutocompleteInteraction<undefined>, core).execute();
        await new Ban(interaction as unknown as ChatInputCommandInteraction<undefined>, core).execute();

        expect(sink.records.map((record) => record.channel)).toEqual(['interactions', 'interactions', 'interactions']);
    });
});
