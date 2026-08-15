import { describe, expectTypeOf, it } from 'vitest';

import type { FrameworkChannel, LoggerChannelId, LoggerConfig } from '#src/Interfaces/LogSink';

describe('FrameworkChannel', () => {
    it('pins the reserved channel set', () => {
        expectTypeOf<FrameworkChannel>().toEqualTypeOf<
            | 'default'
            | 'bot'
            | 'lifecycle'
            | 'health'
            | 'interactions'
            | 'events'
            | 'commands'
            | 'subscribers'
            | 'errors'
            | 'gates'
            | 'plugins'
            | 'hmr'
            | 'cli'
            | 'tsc'
        >();
    });

    it('admits any string through LoggerChannelId', () => {
        expectTypeOf<FrameworkChannel>().toExtend<LoggerChannelId>();
        expectTypeOf<'my-plugin'>().toExtend<LoggerChannelId>();
        expectTypeOf<string>().toExtend<LoggerChannelId>();
    });
});

describe('LoggerConfig.channels', () => {
    type Channels = NonNullable<LoggerConfig['channels']>;

    it('takes a framework channel and an arbitrary channel', () => {
        expectTypeOf<{ events: { level: 'debug' } }>().toExtend<Channels>();
        expectTypeOf<{ 'my-plugin': { level: 'warn' } }>().toExtend<Channels>();
        expectTypeOf<{ events: { level: 'debug' }; 'my-plugin': { level: 'warn' } }>().toExtend<Channels>();
    });

    it('rejects an unknown level under either kind of key', () => {
        expectTypeOf<{ events: { level: 'loud' } }>().not.toExtend<Channels>();
        expectTypeOf<{ 'my-plugin': { level: 'loud' } }>().not.toExtend<Channels>();
    });

    it('keeps the framework channels as declared keys', () => {
        expectTypeOf<Required<Channels>>().not.toEqualTypeOf<Channels>();
    });
});
