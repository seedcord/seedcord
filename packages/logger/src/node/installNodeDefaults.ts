import { Envapter } from 'envapt';

import { defaultLevel } from '../levels';
import { LoggerChannelRegistry } from '../LoggerChannelRegistry';
import { WinstonConsoleSink } from './WinstonConsoleSink';
import { WinstonFileSink } from './WinstonFileSink';

import type { ILogSink } from '../types';

/**
 * Installs the node default sinks into the registry config layer. Dev is a pretty console plus one
 * combined file, prod is JSON to the console. A node bootstrap calls this before any logging.
 */
export function installNodeDefaults(): void {
    const dev = Envapter.isDevelopment;
    const sinks: ILogSink[] = [new WinstonConsoleSink({ format: dev ? 'pretty' : 'json' })];
    if (dev) sinks.push(new WinstonFileSink());
    LoggerChannelRegistry.instance.configure({ level: defaultLevel(), sinks });
}
