import { SeedcordErrorCode } from '@seedcord/errors';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { beforeEach, describe, expect, it } from 'vitest';

import { MemoryDriver } from '#src/kv/MemoryDriver';
import { Plugin } from '#src/plugin/Plugin';
import { TestPluginHost } from '#tests/utils/TestPluginHost';

import type { CoreBase } from '#interfaces/CoreBase';
import type { ILogSink, LogRecord } from '@seedcord/types';

class FakeSink implements ILogSink {
    public readonly records: LogRecord[] = [];
    public readonly kind = 'console';
    public onLog(record: LogRecord): void {
        this.records.push(record);
    }
}

let sink: FakeSink;

beforeEach(() => {
    LoggerChannelRegistry.instance.reset();
    sink = new FakeSink();
    LoggerChannelRegistry.instance.configure({ level: 'trace', sinks: [sink] });
});

class Notes extends Plugin {
    private readonly notes = this.kv.collection<string>('note');

    constructor(core: CoreBase) {
        super(core);
        this.logger.info('constructed');
    }

    public init(): Promise<void> {
        return Promise.resolve();
    }

    public async save(id: string, text: string): Promise<void> {
        await this.notes.set(id, text);
    }
}

describe('a plugin under its attach key', () => {
    it('keeps its records and its constructor logs under that key', async () => {
        const driver = new MemoryDriver();
        const host = new TestPluginHost('gateway', 'server', driver)
            .attach('a', Notes)
            .attach('b', Notes)
            .attach('group.c', Notes);

        await host.a.save('1', 'one');
        await host.b.save('1', 'two');
        await host.group.c.save('1', 'three');

        const entries = await Array.fromAsync(driver.entries('plugins:'));
        expect(entries.map(([key]) => key).toSorted()).toEqual([
            'plugins:a:note:1',
            'plugins:b:note:1',
            'plugins:group.c:note:1'
        ]);
        expect(sink.records.map((record) => record.channel)).toEqual(['a', 'b', 'group.c']);
    });

    it('throws when a plugin is built with new outside attach()', () => {
        class Outer extends Plugin {
            public readonly inner = new Notes(this.core);
            public init(): Promise<void> {
                return Promise.resolve();
            }
        }

        expect(() => new TestPluginHost().attach('outer', Outer)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginKvOutsideAttach })
        );
    });
});
