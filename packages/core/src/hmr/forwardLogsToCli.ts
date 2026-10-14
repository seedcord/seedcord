import { LoggerChannelRegistry } from '@seedcord/logger';

import { toDevLogLine } from './wire';

import type { LogLevel, LogRecord } from '@seedcord/types';

const ROUTED = ['debug', 'error', 'info', 'log', 'warn'] as const satisfies readonly (keyof Console)[];

type RoutedMethod = (typeof ROUTED)[number];

const CONSOLE_LEVEL: Record<RoutedMethod, LogLevel> = {
    debug: 'debug',
    error: 'error',
    info: 'info',
    log: 'info',
    warn: 'warn'
};

function consoleRecord(level: LogLevel, args: unknown[]): LogRecord {
    const [first, ...rest] = args;
    const isFormat = typeof first === 'string';
    return {
        level,
        message: isFormat ? first : '',
        args: isFormat ? rest : args,
        label: 'Console',
        channel: 'default',
        timestamp: Date.now()
    };
}

// workaround: workerd cancels a hot.send made during a request. @cloudflare/vite-plugin's runner never awaits it.
// move this back to the dev channel once the plugin gets fixed
export function forwardLogsToCli(): () => void {
    const terminal = console;
    const registry = LoggerChannelRegistry.instance;
    const originals = new Map(ROUTED.map((method) => [method, Object.getOwnPropertyDescriptor(terminal, method)]));
    const state = { dispatching: false };
    const print = terminal.log.bind(terminal);

    const sink = registry.installSink(
        { kind: 'capture', onLog: (record) => print(toDevLogLine(record)) },
        { muteConsole: true }
    );

    for (const method of ROUTED) {
        const original = terminal[method].bind(terminal);
        terminal[method] = (...args: unknown[]): void => {
            // a sink that logs to the console would send its own line back through here
            if (state.dispatching) {
                original(...args);
                return;
            }
            state.dispatching = true;
            try {
                registry.dispatch(consoleRecord(CONSOLE_LEVEL[method], args));
            } finally {
                state.dispatching = false;
            }
        };
    }

    return () => {
        for (const [method, own] of originals) {
            // workerd keeps console's methods on its prototype, where deleting the patch exposes them again
            if (own) Object.defineProperty(terminal, method, own);
            else Reflect.deleteProperty(terminal, method);
        }
        sink.dispose();
    };
}
