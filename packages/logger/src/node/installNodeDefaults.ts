import { Envapter } from 'envapt';

import { defaultLevel } from '#src/levels';
import { LoggerChannelRegistry } from '#src/LoggerChannelRegistry';

import { WinstonConsoleSink } from './WinstonConsoleSink';
import { WinstonFileSink } from './WinstonFileSink';

import type { ILogSink, LoggerConfig } from '@seedcord/types';

function buildDefaultSinks(): ILogSink[] {
    return Envapter.isDevelopment ? [new WinstonConsoleSink(), new WinstonFileSink()] : [new WinstonConsoleSink()];
}

function configureForNode(config: LoggerConfig): void {
    const registry = LoggerChannelRegistry.instance;
    // console only, because every configure({}) at dev teardown would otherwise open a new log file
    registry.setDefaultSinks(() => [new WinstonConsoleSink()]);
    registry.configure(config);
}

/**
 * Installs the node defaults into the registry config layer. Dev is a console plus one combined file,
 * anything else is a console only. A node bot's `start()` calls this. After this call, `configure` falls
 * back to the node console sink when a config omits `sinks`.
 *
 * @param overrides - A bot's `config.logger`. Level, sinks, or channels the bot sets take precedence.
 * Omitted fields keep the node defaults.
 */
export function installNodeDefaults(overrides?: LoggerConfig): void {
    configureForNode({
        level: overrides?.level ?? defaultLevel(),
        sinks: overrides?.sinks ?? buildDefaultSinks(),
        channels: overrides?.channels ?? {}
    });
}

/**
 * Installs only the node console sink. After this call, `configure` falls back to the same sink when a
 * config omits `sinks`.
 */
export function installNodeConsole(): void {
    configureForNode({});
}
