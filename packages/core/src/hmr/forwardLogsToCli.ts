import { LoggerChannelRegistry } from '@seedcord/logger';
import { CONSOLE_LEVEL, consoleRecord, routeConsole } from '@seedcord/logger/internal';

import { toDevLogLine } from './wire';

import type { ConsoleMethod } from '@seedcord/logger/internal';

// workerd's Console prints the arguments of these and nothing for group, count or time
const WORKER_ROUTED = [
    'debug',
    'dir',
    'dirxml',
    'error',
    'info',
    'log',
    'table',
    'trace',
    'warn'
] as const satisfies readonly ConsoleMethod[];

// workaround: workerd cancels a hot.send made during a request. @cloudflare/vite-plugin's runner never awaits it.
// move this back to the dev channel once the plugin gets fixed
export function forwardLogsToCli(): void {
    const registry = LoggerChannelRegistry.instance;
    // eslint-disable-next-line no-console -- console is the transport
    const print = console.log.bind(console);
    registry.installSink({ kind: 'capture', onLog: (record) => print(toDevLogLine(record)) }, { muteConsole: true });
    routeConsole(WORKER_ROUTED, (method, args) => {
        const [first, ...rest] = args;
        const level = CONSOLE_LEVEL[method];
        registry.dispatch(
            typeof first === 'string' ? consoleRecord(level, first, rest) : consoleRecord(level, '', args)
        );
    });
}
