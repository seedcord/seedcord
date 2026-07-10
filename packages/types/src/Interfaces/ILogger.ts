/**
 * One method per severity. `msg` is the printf-style template,
 * `args` fill its specifiers and trail as extra fields.
 *
 * @example
 * ```ts
 * logger.error('Failed to load %s', url, { code: 404 });
 * logger.info('User %s has %d points and %f rating', username, points, rating, { extra: 'data' });
 * ```
 */
export interface ILogger {
    error(msg: string, ...args: unknown[]): void;
    warn(msg: string, ...args: unknown[]): void;
    info(msg: string, ...args: unknown[]): void;
    debug(msg: string, ...args: unknown[]): void;
    trace(msg: string, ...args: unknown[]): void;
}
