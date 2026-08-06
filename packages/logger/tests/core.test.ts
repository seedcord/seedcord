import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Logger } from '@src/Logger';
import { LoggerChannelRegistry } from '@src/LoggerChannelRegistry';

import type { ILogSink, LogRecord } from '@src/types';

class FakeSink implements ILogSink {
    public readonly records: LogRecord[] = [];
    public constructor(public readonly kind: ILogSink['kind'] = 'console') {}
    public onLog(record: LogRecord): void {
        this.records.push(record);
    }
}

const registry = LoggerChannelRegistry.instance;

beforeEach(() => registry.reset());

describe('Logger dispatch', () => {
    it('builds a record with level, message, label, channel, and args', () => {
        const sink = new FakeSink();
        registry.configure({ level: 'trace', sinks: [sink] });

        new Logger('Bot').info('pong sent', { user: '42' });

        expect(sink.records).toHaveLength(1);
        expect(sink.records[0]).toMatchObject({
            level: 'info',
            message: 'pong sent',
            label: 'Bot',
            channel: 'default',
            args: [{ user: '42' }]
        });
        expect(typeof sink.records[0]?.timestamp).toBe('number');
    });

    it('omits args when none are passed', () => {
        const sink = new FakeSink();
        registry.configure({ level: 'trace', sinks: [sink] });

        new Logger('Bot').info('bare');

        expect(sink.records[0]?.args).toBeUndefined();
    });

    it('routes inChannel and setChannel to the record channel', () => {
        const sink = new FakeSink();
        registry.configure({ level: 'trace', sinks: [sink] });

        const base = new Logger('Bot');
        base.inChannel('hmr').warn('a');
        base.setChannel('events');
        base.warn('b');

        expect(sink.records.map((r) => r.channel)).toEqual(['hmr', 'events']);
    });
});

describe('level gate', () => {
    it('drops records below the global level', () => {
        const sink = new FakeSink();
        registry.configure({ level: 'warn', sinks: [sink] });

        const log = new Logger('X');
        log.error('e');
        log.warn('w');
        log.info('i');
        log.trace('t');

        expect(sink.records.map((r) => r.level)).toEqual(['error', 'warn']);
    });

    it('applies a per-channel level override', () => {
        const sink = new FakeSink();
        registry.configure({ level: 'info', sinks: [sink], channels: { events: { level: 'trace' } } });

        new Logger('X', { channel: 'events' }).trace('verbose');
        new Logger('X').trace('dropped');

        expect(sink.records.map((r) => r.message)).toEqual(['verbose']);
    });

    it('dispatches a debug record under a trace floor', () => {
        const sink = new FakeSink();
        registry.configure({ level: 'trace', sinks: [sink] });

        new Logger('X').debug('dbg');

        expect(sink.records.map((r) => r.message)).toEqual(['dbg']);
    });
});

describe('two layers and muteConsole', () => {
    it('capture sinks always receive, config console sinks skip while muted', () => {
        const consoleSink = new FakeSink('console');
        const fileSink = new FakeSink('file');
        const capture = new FakeSink('capture');
        registry.configure({ level: 'trace', sinks: [consoleSink, fileSink] });
        registry.installSink(capture, { muteConsole: true });

        new Logger('X').info('hi');

        expect(consoleSink.records).toHaveLength(0);
        expect(fileSink.records).toHaveLength(1);
        expect(capture.records).toHaveLength(1);
    });

    it('un-mutes the console once the muting capture disposes', () => {
        const consoleSink = new FakeSink('console');
        registry.configure({ level: 'trace', sinks: [consoleSink] });
        const handle = registry.installSink(new FakeSink('capture'), { muteConsole: true });

        new Logger('X').info('muted');
        handle.dispose();
        new Logger('X').info('shown');

        expect(consoleSink.records.map((r) => r.message)).toEqual(['shown']);
    });

    it('applies per-channel sink overrides, capture layer still receives', () => {
        const globalSink = new FakeSink();
        const channelSink = new FakeSink();
        const capture = new FakeSink('capture');
        registry.configure({ level: 'trace', sinks: [globalSink], channels: { errors: { sinks: [channelSink] } } });
        registry.installSink(capture, { muteConsole: false });

        new Logger('X', { channel: 'errors' }).info('boom');

        expect(globalSink.records).toHaveLength(0);
        expect(channelSink.records).toHaveLength(1);
        expect(capture.records).toHaveLength(1);
    });

    it('does not retro-mute a console sink when a capture installs muting mid-dispatch', () => {
        const second = new FakeSink('console');
        const installer: ILogSink = {
            kind: 'console',
            onLog: () => void registry.installSink(new FakeSink('capture'), { muteConsole: true })
        };
        registry.configure({ level: 'trace', sinks: [installer, second] });

        new Logger('X').info('hi');

        expect(second.records).toHaveLength(1);
    });

    it('leaves the console unmuted when muteConsole is not passed', () => {
        const consoleSink = new FakeSink('console');
        registry.configure({ level: 'trace', sinks: [consoleSink] });
        registry.installSink(new FakeSink('capture'));

        new Logger('X').info('shown');
        expect(consoleSink.records.map((r) => r.message)).toEqual(['shown']);
    });
});

describe('configure and reset', () => {
    it('full-replaces the config layer', () => {
        const first = new FakeSink();
        const second = new FakeSink();
        registry.configure({ level: 'trace', sinks: [first] });
        registry.configure({ level: 'trace', sinks: [second] });

        new Logger('X').info('hi');

        expect(first.records).toHaveLength(0);
        expect(second.records).toHaveLength(1);
    });

    it('reset clears config and capture layers', () => {
        const sink = new FakeSink();
        const capture = new FakeSink('capture');
        registry.configure({ level: 'trace', sinks: [sink] });
        registry.installSink(capture, { muteConsole: false });

        registry.reset();
        new Logger('X').info('after reset');

        expect(sink.records).toHaveLength(0);
        expect(capture.records).toHaveLength(0);
    });

    it('delegates Logger.configure to the registry', () => {
        const sink = new FakeSink();
        Logger.configure({ level: 'trace', sinks: [sink] });

        new Logger('X').info('via static');

        expect(sink.records.map((r) => r.message)).toEqual(['via static']);
    });

    it('falls back to a default sink when configure omits sinks', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        registry.configure({ level: 'trace' });

        new Logger('X').error('to default');

        expect(spy).toHaveBeenCalledOnce();
        spy.mockRestore();
    });

    it('disposes a global sink evicted on reconfigure', () => {
        const dispose = vi.fn();
        registry.configure({ level: 'trace', sinks: [{ kind: 'console', onLog: () => undefined, dispose }] });
        registry.configure({ level: 'trace', sinks: [] });

        expect(dispose).toHaveBeenCalledOnce();
    });

    it('disposes a channel-override sink dropped on reconfigure', () => {
        const dispose = vi.fn();
        const channelSink: ILogSink = { kind: 'file', onLog: () => undefined, dispose };
        registry.configure({ level: 'trace', sinks: [], channels: { errors: { sinks: [channelSink] } } });
        registry.configure({ level: 'trace', sinks: [] });

        expect(dispose).toHaveBeenCalledOnce();
    });

    it('keeps a sink reused across configures open', () => {
        const dispose = vi.fn();
        const shared: ILogSink = { kind: 'console', onLog: () => undefined, dispose };
        registry.configure({ level: 'trace', sinks: [shared] });
        registry.configure({ level: 'trace', sinks: [shared] });

        expect(dispose).not.toHaveBeenCalled();
    });

    it('disposes config sinks on reset', () => {
        const dispose = vi.fn();
        registry.configure({ level: 'trace', sinks: [{ kind: 'file', onLog: () => undefined, dispose }] });
        registry.reset();

        expect(dispose).toHaveBeenCalledOnce();
    });
});

describe('dispatch re-entrancy', () => {
    it('does not dispatch to a capture sink installed during the same dispatch', () => {
        const late = new FakeSink('capture');
        const installer: ILogSink = {
            kind: 'capture',
            onLog: () => void registry.installSink(late, { muteConsole: false })
        };
        registry.configure({ level: 'trace', sinks: [] });
        registry.installSink(installer, { muteConsole: false });

        new Logger('X').info('first');

        expect(late.records).toHaveLength(0);
    });

    it('reaches a capture a config sink installs mid-dispatch', () => {
        const late = new FakeSink('capture');
        const installer: ILogSink = {
            kind: 'console',
            onLog: () => void registry.installSink(late, { muteConsole: false })
        };
        registry.configure({ level: 'trace', sinks: [installer] });

        new Logger('X').info('first');

        expect(late.records.map((r) => r.message)).toEqual(['first']);
    });
});

describe('disposable handle', () => {
    it('uninstalls the capture sink on scope exit via using', () => {
        const capture = new FakeSink('capture');
        registry.configure({ level: 'trace', sinks: [] });
        {
            using _handle = registry.installSink(capture, { muteConsole: false });
            new Logger('X').info('inside');
        }
        new Logger('X').info('after');

        expect(capture.records.map((r) => r.message)).toEqual(['inside']);
    });
});

class ThrowingSink implements ILogSink {
    public calls = 0;
    public constructor(public readonly kind: ILogSink['kind'] = 'console') {}
    public onLog(): void {
        this.calls++;
        throw new Error('sink exploded');
    }
}

describe('a sink that throws', () => {
    it('keeps the throw away from whatever logged', () => {
        registry.configure({ level: 'trace', sinks: [new ThrowingSink()] });

        expect(() => new Logger('Bot').info('ping')).not.toThrow();
    });

    it('still reaches the sinks after it', () => {
        const healthy = new FakeSink();
        registry.configure({ level: 'trace', sinks: [new ThrowingSink(), healthy] });

        new Logger('Bot').info('ping');

        expect(healthy.records.map((r) => r.message)).toEqual(['ping']);
    });

    it('keeps a throwing config sink away from the captures', () => {
        const capture = new FakeSink('capture');
        registry.configure({ level: 'trace', sinks: [new ThrowingSink()] });
        registry.installSink(capture);

        new Logger('Bot').info('ping');

        expect(capture.records).toHaveLength(1);
    });
});
