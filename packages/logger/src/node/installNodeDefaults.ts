import { Envapter } from 'envapt';

import { defaultLevel } from '../levels';
import { LoggerChannelRegistry } from '../LoggerChannelRegistry';
import { WinstonConsoleSink } from './WinstonConsoleSink';
import { WinstonFileSink } from './WinstonFileSink';

import type { ILogSink, LoggerConfig } from '../types';

function buildDefaultSinks(): ILogSink[] {
    const dev = Envapter.isDevelopment;
    const sinks: ILogSink[] = [new WinstonConsoleSink({ format: dev ? 'pretty' : 'json' })];
    if (dev) sinks.push(new WinstonFileSink());
    return sinks;
}

/**
 * Installs the node defaults into the registry config layer. Dev is a pretty console plus one
 * combined file, prod is JSON to the console. A node bootstrap calls this before any logging.
 *
 * @param overrides - A bot's `config.logger`. Level, sinks, or channels the bot sets take precedence.
 * Omitted fields keep the node defaults.
 */
export function installNodeDefaults(overrides?: LoggerConfig): void {
    LoggerChannelRegistry.instance.configure({
        level: overrides?.level ?? defaultLevel(),
        sinks: overrides?.sinks ?? buildDefaultSinks(),
        channels: overrides?.channels ?? {}
    });
}
