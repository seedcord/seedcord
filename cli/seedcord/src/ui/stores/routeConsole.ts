import { Console } from 'node:console';
import { Writable } from 'node:stream';

import { LoggerChannelRegistry } from '@seedcord/logger';

import type { LogLevel } from '@seedcord/types';

// the methods ink's patchConsole caught before the dev ui turned it off
const ROUTED = [
    'assert',
    'count',
    'countReset',
    'debug',
    'dir',
    'dirxml',
    'error',
    'group',
    'groupCollapsed',
    'groupEnd',
    'info',
    'log',
    'table',
    'time',
    'timeEnd',
    'timeLog',
    'trace',
    'warn'
] as const satisfies readonly (keyof Console)[];

type RoutedMethod = (typeof ROUTED)[number];

// node's own console sends assert to warn and trace to error
const LEVEL_OF: Partial<Record<RoutedMethod, LogLevel>> = {
    assert: 'warn',
    warn: 'warn',
    error: 'error',
    trace: 'error',
    debug: 'debug'
};

class ConsoleRoute {
    private readonly originals = Object.getOwnPropertyDescriptors(console);
    private level: LogLevel = 'info';
    private dispatching = false;

    // a separate console keeps the group indent, counters and timers for the routed calls
    private readonly formatter = new Console({ stdout: this.toLogs(), stderr: this.toLogs() });

    public install(): void {
        for (const method of ROUTED) {
            const value = (...args: unknown[]): void => this.call(method, args);
            Object.defineProperty(console, method, { configurable: true, writable: true, value });
        }
    }

    public restore(): void {
        for (const method of ROUTED) Object.defineProperty(console, method, this.originals[method]);
    }

    private call(method: RoutedMethod, args: unknown[]): void {
        // a sink that logs to the console would route its own line back to itself
        if (this.dispatching) {
            Reflect.apply(this.originals[method].value as (...args: unknown[]) => void, console, args);
            return;
        }
        this.level = LEVEL_OF[method] ?? 'info';
        // eslint-disable-next-line @typescript-eslint/unbound-method -- node's Console binds every method to its instance
        Reflect.apply(this.formatter[method], this.formatter, args);
    }

    private toLogs(): Writable {
        return new Writable({
            write: (chunk: Buffer, _encoding, done) => {
                this.dispatching = true;
                try {
                    LoggerChannelRegistry.instance.dispatch({
                        level: this.level,
                        message: chunk.toString().replace(/\n$/, ''),
                        label: 'Console',
                        channel: 'default',
                        timestamp: Date.now()
                    });
                } finally {
                    this.dispatching = false;
                }
                done();
            }
        });
    }
}

// sends wrangler's and a bot's own console calls to the log list and the log file
// ink's alternate screen shows none of them
export function routeConsoleToLogs(): () => void {
    const route = new ConsoleRoute();
    route.install();
    return () => route.restore();
}
