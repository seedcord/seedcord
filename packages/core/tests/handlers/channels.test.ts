import { LoggerChannelRegistry } from '@seedcord/logger';
import { beforeEach, describe, expect, it } from 'vitest';

import { BaseHandler } from '#src/handlers/BaseHandler';
import { Subscriber } from '#subscribers/Subscriber';

import type { CoreBase } from '#interfaces/CoreBase';
import type { ILogSink, LogRecord } from '@seedcord/types';

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

// justified: the bases reach nothing on core in these probes
const core = {} as CoreBase;

class Eventish extends BaseHandler<string, CoreBase> {
    constructor(event: string) {
        super(event, core, undefined, 'events');
    }
    public execute(): Promise<void> {
        this.logger.info('ran');
        return Promise.resolve();
    }
}

class Interactionish extends BaseHandler<string, CoreBase> {
    constructor(event: string) {
        super(event, core, undefined, 'interactions');
    }
    public execute(): Promise<void> {
        this.logger.info('ran');
        return Promise.resolve();
    }
}

class Unchanneled extends BaseHandler<string, CoreBase> {
    constructor(event: string) {
        super(event, core);
    }
    public execute(): Promise<void> {
        this.logger.info('ran');
        return Promise.resolve();
    }
}

// eslint-disable-next-line @seedcord/subscriber-missing-decorators -- it's just for testing
class Reporter extends Subscriber<'unknownException', CoreBase> {
    public execute(): Promise<void> {
        this.logger.info('reported');
        return Promise.resolve();
    }
}

describe('handler log channels', () => {
    it('emits on the channel its family base declares', async () => {
        await new Eventish('e').execute();
        await new Interactionish('i').execute();

        expect(sink.records.map((record) => record.channel)).toEqual(['events', 'interactions']);
    });

    it('labels the record with the concrete subclass name', async () => {
        await new Eventish('e').execute();

        expect(sink.records[0]?.label).toBe('Eventish');
    });

    it('falls back to the default channel when a base declares none', async () => {
        await new Unchanneled('u').execute();

        expect(sink.records[0]?.channel).toBe('default');
    });
});

describe('subscriber log channel', () => {
    it('emits on the subscribers channel', async () => {
        // justified: execute reaches nothing on the payload or core
        await new Reporter({} as ConstructorParameters<typeof Reporter>[0], core).execute();

        expect(sink.records[0]?.channel).toBe('subscribers');
        expect(sink.records[0]?.label).toBe('Reporter');
    });
});
