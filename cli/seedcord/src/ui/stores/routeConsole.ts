import { Console } from 'node:console';
import { Writable } from 'node:stream';
import { format } from 'node:util';

import { LoggerChannelRegistry } from '@seedcord/logger';
import { CONSOLE_LEVEL, CONSOLE_METHODS, consoleRecord, routeConsole, traceError } from '@seedcord/logger/internal';

import type { LogLevel } from '@seedcord/types';

// ink's alternate screen hides the cloudflare plugin's and the bot's own console output
export function routeConsoleToLogs(): () => void {
    let level: LogLevel = 'info';
    const toLogs = new Writable({
        write(chunk: Buffer, _encoding, done) {
            LoggerChannelRegistry.instance.dispatch(consoleRecord(level, chunk.toString().replace(/\n$/, '')));
            done();
        }
    });
    // a separate console keeps the group indent, counters and timers for the routed calls
    const formatter = new Console({ stdout: toLogs, stderr: toLogs });

    return routeConsole(CONSOLE_METHODS, (method, args, invoked) => {
        level = CONSOLE_LEVEL[method];
        if (method === 'trace') {
            LoggerChannelRegistry.instance.dispatch(consoleRecord(level, '', [traceError(format(...args), invoked)]));
            return;
        }
        // eslint-disable-next-line @typescript-eslint/unbound-method -- node's Console binds every method to its instance
        Reflect.apply(formatter[method], formatter, args);
    });
}
