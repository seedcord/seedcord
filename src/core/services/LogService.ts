import { createLogger, format, Logform, Logger, transports } from 'winston';
import { Globals } from '../library/globals/Globals';

export class LogService {
  declare private logger: Logger;
  private static instances = new Map<string, LogService>();

  private static instance(prefix: string): LogService {
    let instance = this.instances.get(prefix);
    if (!instance) {
      instance = new LogService(prefix);
      this.instances.set(prefix, instance);
    }
    return instance;
  }

  constructor(transportName: string) {
    const formatCustomizations = this.getFormatCustomizations();
    const consoleTransport = this.createConsoleTransport(transportName, formatCustomizations);
    this.initializeLogger(consoleTransport);
  }

  private getFormatCustomizations(): Logform.Format[] {
    return [
      format.errors({ stack: true }),
      format.colorize({ level: true }),
      format.timestamp({ format: 'D MMM, hh:mm:ss a' }),
      format.printf((info) => {
        const ts = String(info.timestamp);
        const lvl = String(info.level).padEnd(7);
        const lbl = String(info.label);
        const msg = String(info.message);
        const base = `${ts} [${lvl}]: ${lbl} - ${msg}`;

        if (typeof info.stack === 'string') {
          return `${base}\n${info.stack}`;
        }
        return base;
      })
    ];
  }

  private createConsoleTransport(transportName: string, customization: Logform.Format[]) {
    return new transports.Console({
      format: format.combine(format.label({ label: transportName }), ...customization),
      level: Globals.isProduction ? 'info' : 'debug'
    });
  }

  private initializeLogger(consoleTransport: transports.ConsoleTransportInstance) {
    if (Globals.isProduction) {
      this.logger = createLogger({
        transports: [consoleTransport]
      });
    } else {
      this.logger = createLogger({
        transports: [
          // new transports.File({
          //   filename: 'Logs/testing.log',
          //   format: format.combine(
          //     format.uncolorize(), // This removes ANSI color codes
          //     format.json({ space: 2 })
          //   )
          // }),
          consoleTransport
        ]
      });
    }
  }

  public error(msg: string, ...args: unknown[]) {
    this.logger.error(msg, ...args);
  }

  public warn(msg: string, ...args: unknown[]) {
    this.logger.warn(msg, ...args);
  }

  public info(msg: string, ...args: unknown[]) {
    this.logger.info(msg, ...args);
  }

  public http(msg: string, ...args: unknown[]) {
    this.logger.http(msg, ...args);
  }

  public verbose(msg: string, ...args: unknown[]) {
    this.logger.verbose(msg, ...args);
  }

  public debug(msg: string, ...args: unknown[]) {
    this.logger.debug(msg, ...args);
  }

  public silly(msg: string, ...args: unknown[]) {
    this.logger.silly(msg, ...args);
  }

  public static Error(prefix: string, msg: string, ...args: unknown[]) {
    const logger = this.instance(prefix);
    logger.error(msg, ...args);
  }

  public static Info(prefix: string, msg: string, ...args: unknown[]) {
    const logger = this.instance(prefix);
    logger.info(msg, ...args);
  }

  public static Warn(prefix: string, msg: string, ...args: unknown[]) {
    const logger = this.instance(prefix);
    logger.warn(msg, ...args);
  }

  public static Debug(prefix: string, msg: string, ...args: unknown[]) {
    const logger = this.instance(prefix);
    logger.debug(msg, ...args);
  }
}
