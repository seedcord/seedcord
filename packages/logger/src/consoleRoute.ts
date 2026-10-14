import type { LogLevel, LogRecord } from '@seedcord/types';

export const CONSOLE_METHODS = [
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

export type ConsoleMethod = (typeof CONSOLE_METHODS)[number];

// node's own console sends assert to warn and trace to error
export const CONSOLE_LEVEL: Record<ConsoleMethod, LogLevel> = {
    assert: 'warn',
    count: 'info',
    countReset: 'info',
    debug: 'debug',
    dir: 'info',
    dirxml: 'info',
    error: 'error',
    group: 'info',
    groupCollapsed: 'info',
    groupEnd: 'info',
    info: 'info',
    log: 'info',
    table: 'info',
    time: 'info',
    timeEnd: 'info',
    timeLog: 'info',
    trace: 'error',
    warn: 'warn'
};

export function consoleRecord(level: LogLevel, message: string, args?: unknown[]): LogRecord {
    const record: LogRecord = { level, message, label: 'Console', channel: 'default', timestamp: Date.now() };
    if (args?.length) record.args = args;
    return record;
}

type PatchedMethod = (...args: unknown[]) => void;

type Route = (method: ConsoleMethod, args: unknown[], invoked: PatchedMethod) => void;

// node's console.trace prints an error named Trace, its stack starting at the call
export function traceError(message: string, invoked: PatchedMethod): Error {
    const trace = new Error(message);
    trace.name = 'Trace';
    Error.captureStackTrace(trace, invoked);
    return trace;
}

class ConsoleRoute {
    private readonly target = console;
    private readonly originals: Map<ConsoleMethod, PropertyDescriptor | undefined>;
    private routing = false;

    constructor(
        private readonly methods: readonly ConsoleMethod[],
        private readonly route: Route
    ) {
        this.originals = new Map(
            methods.map((method) => [method, Object.getOwnPropertyDescriptor(this.target, method)])
        );
    }

    public install(): void {
        for (const method of this.methods) {
            const original = this.target[method].bind(this.target);
            const value: PatchedMethod = (...args) => this.call(method, original, args, value);
            Object.defineProperty(this.target, method, { configurable: true, writable: true, value });
        }
    }

    public restore(): void {
        for (const [method, own] of this.originals) {
            // workerd keeps console's methods on its prototype, where deleting the patch exposes them again
            if (own) Object.defineProperty(this.target, method, own);
            else Reflect.deleteProperty(this.target, method);
        }
    }

    private call(
        method: ConsoleMethod,
        original: (...args: never[]) => void,
        args: unknown[],
        invoked: PatchedMethod
    ): void {
        // a sink that logs to the console would route its own line back to itself
        if (this.routing) {
            Reflect.apply(original, undefined, args);
            return;
        }
        this.routing = true;
        try {
            this.route(method, args, invoked);
        } finally {
            this.routing = false;
        }
    }
}

type RestoreConsole = () => void;

export function routeConsole(methods: readonly ConsoleMethod[], route: Route): RestoreConsole {
    const consoleRoute = new ConsoleRoute(methods, route);
    consoleRoute.install();
    return () => consoleRoute.restore();
}
