import chalk from 'chalk';
import { UUID } from 'crypto';
import { Guild, User } from 'discord.js';
import * as path from 'path';
import { CoreBot } from '../../core/CoreBot';
import { Hooks } from '../../core/hooks/interfaces/Hooks';
import { traverseDirectory } from '../../core/library/Helpers';
import { LogService } from '../../core/services/LogService';
import { ErrorType } from '../decorators/ErrorConfigurable';
import { DatabaseError } from '../errors/Database';
import { BaseErrorConstructor, BaseErrorEmbed, BaseErrorEmbedConstructor, CustomError } from '../interfaces/Components';

export class ErrorController {
  private logger = new LogService('Errors');
  private isInitialized = false;

  private errorMap = new Map<string, BaseErrorConstructor>();
  private embedMap = new Map<string, BaseErrorEmbedConstructor>();

  public constructor(protected core: CoreBot) {}

  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;

    const errorsDir = path.resolve(__dirname, '../errors');
    this.logger.info(chalk.bold(errorsDir));

    await this.loadErrors(errorsDir);

    const missingEmbeds = this.errorsWithoutEmbeds();
    if (missingEmbeds.length > 0) {
      this.logger.info(
        `${chalk.bold.red('Missing Embeds')}: ${missingEmbeds.join(', ')}` + ` (${missingEmbeds.length})`
      );
    } else {
      this.logger.info(`${chalk.bold.green('All errors have corresponding embeds')}`);
    }
    this.logger.info(
      `${chalk.bold.green('Loaded')}: ${chalk.bold.magenta(this.errorMap.size)} errors | ` +
        `${chalk.bold.magenta(this.embedMap.size)} embeds`
    );
  }

  private errorsWithoutEmbeds(): string[] {
    const errorsWithoutEmbeds: string[] = [];
    this.errorMap.forEach((_ctor, errorKey) => {
      if (!this.embedMap.has(errorKey)) {
        errorsWithoutEmbeds.push(errorKey);
      }
    });
    return errorsWithoutEmbeds;
  }

  private async loadErrors(dir: string): Promise<void> {
    await traverseDirectory(dir, (_fullPath, _relativePath, imported) => {
      for (const exportName of Object.keys(imported)) {
        const exportedObj = <unknown>imported[exportName];

        if (this.isBaseError(exportedObj)) {
          const errorKey = Reflect.getMetadata(ErrorType.Key, exportedObj) as string | undefined;
          if (errorKey) {
            this.registerError(errorKey, exportedObj);
          }
        }

        if (this.isBaseErrorEmbed(exportedObj)) {
          const embedKey = Reflect.getMetadata(ErrorType.Value, exportedObj) as string | undefined;
          if (embedKey) {
            this.registerEmbed(embedKey, exportedObj);
            this.logger.info(
              `${chalk.italic('Registered')} ${chalk.bold.yellow(embedKey)} for ${chalk.gray(exportedObj.name)}`
            );
          }
        }
      }
    });
  }

  private isBaseError(obj: unknown): obj is BaseErrorConstructor {
    if (typeof obj !== 'function') return false;
    return obj.prototype instanceof CustomError && Reflect.hasMetadata(ErrorType.Key, obj);
  }

  private registerError(errorKey: string, errorCtor: BaseErrorConstructor): void {
    this.errorMap.set(errorKey, errorCtor);
  }

  private isBaseErrorEmbed(obj: unknown): obj is BaseErrorEmbedConstructor {
    if (typeof obj !== 'function') return false;
    return obj.prototype instanceof BaseErrorEmbed && Reflect.hasMetadata(ErrorType.Value, obj);
  }

  private registerEmbed(embedKey: string, embedCtor: BaseErrorEmbedConstructor): void {
    this.embedMap.set(embedKey, embedCtor);
  }

  public getErrorEmbed(error: Error, guild: Guild, user: User): BaseErrorEmbed {
    const uuid = crypto.randomUUID();

    if (error instanceof CustomError) {
      if (error instanceof DatabaseError) {
        this.core.hooks.emit(Hooks.UnknownException, [error.uuid, error, guild, user]);
        this.logger.error(`DatabaseError: ${error.uuid}`);
      } else if (error.emit) {
        this.logger.error(`${error.name}: ${error.message}`, error);
      }
    } else {
      this.logger.error(uuid, error);
    }

    const errorKey =
      error instanceof CustomError
        ? (Reflect.getMetadata(ErrorType.Key, error.constructor) as string | undefined)
        : undefined;

    if (!errorKey) {
      return this.newGenericErrorEmbed(uuid, error, guild, user);
    }

    const embedCtor = this.embedMap.get(errorKey);

    return new embedCtor!(<CustomError>error);
  }

  private newGenericErrorEmbed(uuid: UUID, error: Error, guild: Guild, user: User): GenericErrorEmbed {
    this.core.hooks.emit(Hooks.UnknownException, [uuid, error, guild, user]);
    return new GenericErrorEmbed(uuid);
  }
}

class GenericErrorEmbed extends BaseErrorEmbed {
  constructor(uuid: UUID) {
    super();

    this.instance
      .setTitle('Error')
      .setDescription(
        `An unknown error occurred. Please reach out to CoUnity with a way to reproduce the error and the following:\n` +
          `### UUID: \`${uuid}\``
      );
  }
}
