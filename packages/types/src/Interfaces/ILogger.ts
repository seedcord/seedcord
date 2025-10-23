/**
 * ILogger interface defining logging methods for various log levels.
 */
export interface ILogger {
    error(msg: string, ...args: unknown[]): void;
    warn(msg: string, ...args: unknown[]): void;
    info(msg: string, ...args: unknown[]): void;
    http(msg: string, ...args: unknown[]): void;
    verbose(msg: string, ...args: unknown[]): void;
    debug(msg: string, ...args: unknown[]): void;
    silly(msg: string, ...args: unknown[]): void;
}
