import { CustomError } from '@interfaces/Components';

/**
 * Thrown when a customId was minted by an older version of its shape.
 *
 * This is normal after the shape changes. The reply tells the user to run the command again.
 */
export class StaleCustomId extends CustomError {
    constructor(prefix: string) {
        super(`Stale customId for "${prefix}".`);

        this.response
            .setTitle('Outdated')
            .setDescription('This button or menu is from an older version. Please run the command again.');
    }
}

/**
 * Thrown when a customId wire is corrupt or tampered with and cannot be trusted.
 *
 * This should not happen in normal use, so it is logged (emit is set true).
 */
export class InvalidCustomId extends CustomError {
    constructor(detail: string) {
        super(`Invalid customId. ${detail}`);

        this.emit = true;
        this.response.setDescription('Something went wrong. Please try again.');
    }
}
