import { createLogger, format, transports } from 'winston';

import { Globals } from '../library/Globals';

import type { Logform, Logger as Winston } from 'winston';
import type { ConsoleTransportInstance } from 'winston/lib/winston/transports';

export class Logger {
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
      level: Globals.isDevelopment ? 'silly' : Globals.isStaging ? 'debug' : 'info'
    });
  }

  private initializeLogger(consoleTransport: transports.ConsoleTransportInstance): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transportsArray: any[] = [consoleTransport];

    // Add file transport only in non-production environments
    if (Globals.isDevelopment) {
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

  public error(msg: string, ...args: unknown[]): void {
    this.logger.error(msg, ...args);
  }

  public warn(msg: string, ...args: unknown[]): void {
    this.logger.warn(msg, ...args);
  }

  public info(msg: string, ...args: unknown[]): void {
    this.logger.info(msg, ...args);
  }

  public http(msg: string, ...args: unknown[]): void {
    this.logger.http(msg, ...args);
  }

  public verbose(msg: string, ...args: unknown[]): void {
    this.logger.verbose(msg, ...args);
  }

  public debug(msg: string, ...args: unknown[]): void {
    this.logger.debug(msg, ...args);
  }

  public silly(msg: string, ...args: unknown[]): void {
    this.logger.silly(msg, ...args);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static Error(prefix: string, msg: string, ...args: unknown[]): void {
    const logger = this.instance(prefix);
    logger.error(msg, ...args);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static Info(prefix: string, msg: string, ...args: unknown[]): void {
    const logger = this.instance(prefix);
    logger.info(msg, ...args);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static Warn(prefix: string, msg: string, ...args: unknown[]): void {
    const logger = this.instance(prefix);
    logger.warn(msg, ...args);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static Debug(prefix: string, msg: string, ...args: unknown[]): void {
    const logger = this.instance(prefix);
    logger.debug(msg, ...args);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static Silly(prefix: string, msg: string, ...args: unknown[]): void {
    const logger = this.instance(prefix);
    logger.silly(msg, ...args);
  }
}
