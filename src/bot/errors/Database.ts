import { UUID } from 'crypto';

import { ErrorKey, ErrorValue } from '../decorators/ErrorConfigurable';
import { BaseError, BaseErrorEmbed, CustomError } from '../interfaces/Components';

@ErrorKey('DatabaseConnectionFailure')
export class DatabaseConnectionFailure extends BaseError {}

@ErrorValue('DatabaseConnectionFailure')
export class DatabaseConnectionFailureEmbed extends BaseErrorEmbed {
  constructor() {
    super();
    this.instance.setDescription(`Failed to connect to the database.`);
  }
}

// ------

@ErrorKey('DatabaseError')
export class DatabaseError extends CustomError {
  protected override _emit = true; // Emit in logs regardless of environment

  constructor(
    message: string,
    public uuid: UUID
  ) {
    super(message);

    this.name = 'DatabaseError';
  }
}

@ErrorValue('DatabaseError')
export class DatabaseErrorEmbed extends BaseErrorEmbed {
  constructor(error: DatabaseError) {
    super();
    this.instance
      .setTitle('Database Error')
      .setDescription(`An error occurred while interacting with the database.\n### UUID: \`${error.uuid}\``);
  }
}
