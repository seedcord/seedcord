import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/services';

import { ReplySender } from '@bot/ReplySender';
import { Halt } from '@interfaces/Halt';
import { extractErrorResponse } from '@src/miscellaneous/extractErrorResponse';

import type { RepliableInteractionHandler } from '@handlers/repliable';

const logger = new Logger('Catchable');

/**
 * Configuration options for the Catchable decorator.
 */
export interface CatchableOptions {
    /** Whether to log caught errors via the framework Logger {@default false} */
    log?: boolean;
}

/**
 * Catches errors thrown in interaction handler methods and sends an error response.
 *
 * Automatically sends error responses to users and prevents uncaught exceptions.
 * Should be applied to the execute() or runChecks() methods of interaction handlers.
 *
 * @param options - Configuration for error handling behavior
 * @decorator
 * @example
 * ```ts
 * \@SlashRoute('ban')
 * class BanHandler extends SlashHandler<'ban'> {
 *   \@Catchable({ log: true })
 *   async execute() {
 *     const target = this.options.getUser('target');
 *     await this.event.reply(`banned ${target.username}`);
 *   }
 * }
 * ```
 */
export function Catchable(options?: CatchableOptions) {
    return function (
        _target: RepliableInteractionHandler,
        _propertyKey: string,
        descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<void>>
    ): void {
        const log = options?.log ?? false;

        const originalMethod = descriptor.value;

        descriptor.value = async function (this: RepliableInteractionHandler, ...args: any[]): Promise<void> {
            const interaction = this.getEvent();

            if (!originalMethod) throw new SeedcordError(SeedcordErrorCode.DecoratorMethodNotFound);

            try {
                await originalMethod.apply(this, args);
            } catch (error) {
                if (error instanceof Halt) {
                    if (error.reason !== undefined) logger.debug(`Halt: ${error.reason}`);
                    return;
                }
                if (!(error instanceof Error)) throw error;

                this.setErrored();

                if (log) logger.error('Caught handler error', error);

                const { response } = extractErrorResponse(error, this.core, {
                    interaction,
                    guild: interaction.guild,
                    user: interaction.user,
                    metadata: interaction
                });

                await new ReplySender(interaction).send(response);
            }
        };
    };
}
