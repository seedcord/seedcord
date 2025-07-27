import { createLogger, format, transports } from 'winston';

import { Globals } from '../library/globals/Globals';

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
    const padding = 7; // Padding for log level
    return [
      format.errors({ stack: true }),
      format.colorize({ level: true }),
      format.timestamp({ format: 'D MMM, hh:mm:ss a' }),
      format.printf((info) => {
        const ts = String(info.timestamp);
        const lvl = String(info.level).padEnd(padding);
        const lbl = String(info.label);
        const msg = String(info.message);
        const base = `${ts} [${lvl}]: ${lbl} - ${msg}`;

        if (typeof info.stack === 'string') return `${base}\n${info.stack}`;
        return base;
      })
    ];
  }

  private createConsoleTransport(transportName: string): ConsoleTransportInstance {
    return new transports.Console({
      format: format.combine(format.label({ label: transportName }), ...this.getFormatCustomizations()),
      level: Globals.isProduction ? 'info' : 'debug'
    });
  }

  private initializeLogger(consoleTransport: transports.ConsoleTransportInstance): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transportsArray: any[] = [consoleTransport];

    // Add file transport only in non-production environments
    if (!Globals.isProduction) {
      const maxSizeInMB = 10;
      transportsArray.push(
        new transports.File({
          filename: 'logs/application.log',
          level: 'debug',
          format: format.combine(format.uncolorize(), format.json({ space: 2 })),
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
}
