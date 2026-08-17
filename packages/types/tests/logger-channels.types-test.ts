import { expectTypeOf } from 'vitest';

import type { FrameworkChannel, LoggerChannelId, LoggerConfig } from '#src/Interfaces/LogSink';

expectTypeOf<FrameworkChannel>().toExtend<LoggerChannelId>();
expectTypeOf<'my-plugin'>().toExtend<LoggerChannelId>();
expectTypeOf<string>().toExtend<LoggerChannelId>();

type Channels = NonNullable<LoggerConfig['channels']>;

expectTypeOf<{ events: { level: 'debug' } }>().toExtend<Channels>();
expectTypeOf<{ 'my-plugin': { level: 'warn' } }>().toExtend<Channels>();
expectTypeOf<{ events: { level: 'debug' }; 'my-plugin': { level: 'warn' } }>().toExtend<Channels>();

expectTypeOf<{ events: { level: 'loud' } }>().not.toExtend<Channels>();
expectTypeOf<{ 'my-plugin': { level: 'loud' } }>().not.toExtend<Channels>();

expectTypeOf<Required<Channels>>().not.toEqualTypeOf<Channels>();
