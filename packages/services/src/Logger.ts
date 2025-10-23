/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/naming-convention */
import { Envapter } from 'envapt';
import { createLogger, format, transports } from 'winston';

import type { ILogger } from '@seedcord/types';
import type { Logform, Logger as Winston } from 'winston';
import type { ConsoleTransportInstance } from 'winston/lib/winston/transports';

/**
 * Logging service with console and file output support
 *
 * Provides structured logging with timestamps, levels, and labels.
 * Instances are cached by transport name for consistent formatting.
 */
export class Logger implements ILogger {
    declare private logger: Winston;
    private static readonly instances = new Map<string, Logger>();

    private static instance(prefix: string): Logger {
        let instance = this.instances.get(prefix);
        if (!instance) {
            instance = new Logger(prefix);
            this.instances.set(prefix, instance);
        }
        return instance;
    }

    constructor(transportName: string) {
        const consoleTransport = this.createConsoleTransport(transportName);
        this.initializeLogger(consoleTransport);
    }

    private getFormatCustomizations(): Logform.Format[] {
        const padding = 7;
        return [
            format.errors({ stack: true }),
            format.splat(),
            format.colorize({ level: true }),
            format.timestamp({ format: 'D MMM, hh:mm:ss a' }),
            format.printf((info: Logform.TransformableInfo) => {
                const ts = String(info.timestamp ?? '');
                const lvl = String(info.level).padEnd(padding);
                const lbl = String(info.label ?? '');
                const msg = String(info.message ?? '');

                const base = `${ts} [${lvl}]: ${lbl} - ${msg}`;

                const splatSym = Symbol.for('splat');
                const raw = (info as unknown as Record<string | symbol, unknown>)[splatSym];
                const extras = Array.isArray(raw) ? raw : [];

                const cleaned = extras
                    .filter((x) => !(x instanceof Error))
                    .filter((x) => {
                        if (!x) return false;
                        if (typeof x !== 'object') return true;
                        return Object.keys(x as object).length > 0;
                    });

                let rendered = base;

                if (typeof info.stack === 'string') {
                    rendered += `\n${String(info.stack)}`;
                }

                if (cleaned.length) {
                    const parts: string[] = [];
                    for (const x of cleaned) {
                        if (typeof x === 'string') parts.push(x);
                        else {
                            try {
                                parts.push(JSON.stringify(x, null, 2));
                            } catch {
                                parts.push(String(x));
                            }
                        }
                    }
                    rendered += `\n${parts.join(' ')}`;
                }

                return rendered;
            })
        ];
    }

    private createConsoleTransport(transportName: string): ConsoleTransportInstance {
        return new transports.Console({
            format: format.combine(format.label({ label: transportName }), ...this.getFormatCustomizations()),
            level: Envapter.isDevelopment ? 'silly' : Envapter.isStaging ? 'debug' : 'info'
        });
    }

    private initializeLogger(consoleTransport: transports.ConsoleTransportInstance): void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transportsArray: any[] = [consoleTransport];

        // Add file transport only in non-production environments
        if (Envapter.isDevelopment) {
            const maxSizeInMB = 10;
            transportsArray.push(
                new transports.File({
                    filename: 'logs/application.log',
                    level: 'debug',
                    format: format.combine(
                        format.uncolorize(),
                        format.errors({ stack: true }),
                        format.timestamp(),
                        format.json({ bigint: true, space: 2 })
                    ),
                    maxsize: maxSizeInMB * 1024 * 1024, // 10MB
                    maxFiles: 5,
                    tailable: true
                })
            );
        }

        this.logger = createLogger({
            transports: transportsArray
        });
    }

    /**
     * Logs an error message with optional additional data.
     *
     * @param msg - The error message to log
     * @param args - Additional data to include in the log entry
     */
    public error(msg: string, ...args: unknown[]): void {
        this.logger.error(msg, ...args);
    }

    /**
     * Logs a warning message with optional additional data.
     *
     * @param msg - The warning message to log
     * @param args - Additional data to include in the log entry
     */
    public warn(msg: string, ...args: unknown[]): void {
        this.logger.warn(msg, ...args);
    }

    /**
     * Logs an informational message with optional additional data.
     *
     * @param msg - The informational message to log
     * @param args - Additional data to include in the log entry
     */
    public info(msg: string, ...args: unknown[]): void {
        this.logger.info(msg, ...args);
    }

    /**
     * Logs an HTTP-related message with optional additional data.
     *
     * @param msg - The HTTP message to log
     * @param args - Additional data to include in the log entry
     */
    public http(msg: string, ...args: unknown[]): void {
        this.logger.http(msg, ...args);
    }

    /**
     * Logs a verbose message with optional additional data.
     *
     * @param msg - The verbose message to log
     * @param args - Additional data to include in the log entry
     */
    public verbose(msg: string, ...args: unknown[]): void {
        this.logger.verbose(msg, ...args);
    }

    /**
     * Logs a debug message with optional additional data.
     *
     * @param msg - The debug message to log
     * @param args - Additional data to include in the log entry
     */
    public debug(msg: string, ...args: unknown[]): void {
        this.logger.debug(msg, ...args);
    }

    /**
     * Logs a silly/trace level message with optional additional data.
     *
     * @param msg - The silly message to log
     * @param args - Additional data to include in the log entry
     */
    public silly(msg: string, ...args: unknown[]): void {
        this.logger.silly(msg, ...args);
    }

    /**
     * Static method to log an error message with a specific prefix.
     * Creates or retrieves a logger instance for the given prefix.
     *
     * @param prefix - The logger prefix/label to use
     * @param msg - The error message to log
     * @param args - Additional data to include in the log entry
     */
    public static Error(prefix: string, msg: string, ...args: unknown[]): void {
        const logger = this.instance(prefix);
        logger.error(msg, ...args);
    }

    /**
     * Static method to log an informational message with a specific prefix.
     * Creates or retrieves a logger instance for the given prefix.
     *
     * @param prefix - The logger prefix/label to use
     * @param msg - The informational message to log
     * @param args - Additional data to include in the log entry
     */
    public static Info(prefix: string, msg: string, ...args: unknown[]): void {
        const logger = this.instance(prefix);
        logger.info(msg, ...args);
    }

    /**
     * Static method to log a warning message with a specific prefix.
     * Creates or retrieves a logger instance for the given prefix.
     *
     * @param prefix - The logger prefix/label to use
     * @param msg - The warning message to log
     * @param args - Additional data to include in the log entry
     */
    public static Warn(prefix: string, msg: string, ...args: unknown[]): void {
        const logger = this.instance(prefix);
        logger.warn(msg, ...args);
    }

    /**
     * Static method to log a debug message with a specific prefix.
     * Creates or retrieves a logger instance for the given prefix.
     *
     * @param prefix - The logger prefix/label to use
     * @param msg - The debug message to log
     * @param args - Additional data to include in the log entry
     */
    public static Debug(prefix: string, msg: string, ...args: unknown[]): void {
        const logger = this.instance(prefix);
        logger.debug(msg, ...args);
    }

    /**
     * Static method to log a silly/trace level message with a specific prefix.
     * Creates or retrieves a logger instance for the given prefix.
     *
     * @param prefix - The logger prefix/label to use
     * @param msg - The silly message to log
     * @param args - Additional data to include in the log entry
     */
    public static Silly(prefix: string, msg: string, ...args: unknown[]): void {
        const logger = this.instance(prefix);
        logger.silly(msg, ...args);
    }
}
