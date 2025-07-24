import { CustomError } from '../interfaces/Components';

import type { UUID } from 'crypto';

export class DatabaseConnectionFailure extends CustomError {
  constructor(message = 'Failed to connect to the database.') {
    super(message);

    this.response.setDescription('Failed to connect to the database.');
  }
}

export class DatabaseError extends CustomError {
  protected override _emit = true; // Emit in logs regardless of environment

  constructor(
    message: string,
    public uuid: UUID
  ) {
    super(message);
    this.name = 'DatabaseError';

    this.response
      .setTitle('Database Error')
      .setDescription(`An error occurred while interacting with the database.\n### UUID: \`${this.uuid}\``);
  }
}
