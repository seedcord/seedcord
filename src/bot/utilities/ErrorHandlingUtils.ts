import * as crypto from 'crypto';

import { Logger } from '../../core/services/Logger';
import { DatabaseError } from '../errors/Database';
import { CustomError } from '../interfaces/Components';

import type { CoreBot } from '../../core/CoreBot';
import type { Nullish } from '../../core/library/types/Miscellaneous';
import type { UUID } from 'crypto';
import type { EmbedBuilder, Guild, User } from 'discord.js';

export class ErrorHandlingUtils {
  private static readonly logger = new Logger('Errors');

  public static handleError(
    error: Error,
    core: CoreBot,
    guild: Nullish<Guild>,
    user: Nullish<User>
  ): { uuid: UUID; response: EmbedBuilder } {
    const uuid = crypto.randomUUID();

    if (error instanceof CustomError) {
      if (error instanceof DatabaseError) {
        core.hooks.emit('unknownException', { uuid, error, guild, user });

        this.logger.error(`DatabaseError: ${error.uuid}`);
      } else if (error.emit) {
        this.logger.error(`${error.name}: ${error.message}`, error);
      }

      return {
        uuid,
        response: error.response
      };
    }

    this.logger.error(uuid, error);
    core.hooks.emit('unknownException', { uuid, error, guild, user });

    return {
      uuid,
      response: new GenericError(uuid).response
    };
  }
}

// Generic error for non-CustomError instances
class GenericError extends CustomError {
  constructor(private readonly uuid: UUID) {
    super('An unknown error occurred');

    this.response
      .setTitle('Error')
      .setDescription(
        `An unknown error occurred. Please reach out to the developer with a way to reproduce the error and the following:\n` +
          `### UUID: \`${this.uuid}\``
      );
  }
}
