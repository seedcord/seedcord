import { MessageFlags } from 'discord.js';

import { extractErrorResponse } from '@bUtilities/errors/extractErrorResponse';

import type { RepliableInteractionHandler } from '@interfaces/Handler';

/**
 * Configuration options for the Catchable decorator.
 */
export interface CatchableOptions {
    /** Whether to log errors to console (default: `false`) */
    log?: boolean;
    /** Always use followUp instead of reply/editReply (default: `false`) */
    forceFollowup?: boolean;
}

/**
 * Catches and handles errors in interaction handler methods
 *
 * Automatically sends error responses to users and prevents uncaught exceptions.
 * Should be applied to the execute() or runChecks() methods of interaction handlers.
 *
 * @param options - Configuration for error handling behavior
 * @decorator
 * @example
 * ```typescript
 * class MyHandler extends InteractionHandler {
 *   \@Catchable({ log: true })
 *   async execute() {
 *     // method implementation
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
        const forceFollowup = options?.forceFollowup ?? false;

        const originalMethod = descriptor.value;

        descriptor.value = async function (this: RepliableInteractionHandler, ...args: any[]): Promise<void> {
            const interaction = this.getEvent();

            if (!originalMethod) throw new Error('Method not found');

            try {
                await originalMethod.apply(this, args);
            } catch (error) {
                if (!(error instanceof Error)) throw error;

                this.setErrored();

                // eslint-disable-next-line no-console
                if (log) console.error(error);

                const { response } = extractErrorResponse(
                    error,
                    this.core,
                    interaction.guild,
                    interaction.user,
                    interaction
                );

                const res = {
                    embeds: [response],
                    components: []
                };

                if (forceFollowup) {
                    await interaction.followUp({ flags: MessageFlags.Ephemeral, ...res });
                    return;
                }

                if (interaction.replied) {
                    await interaction.followUp({ flags: MessageFlags.Ephemeral, ...res });
                } else if (interaction.deferred) {
                    await interaction.editReply(res);
                } else {
                    await interaction.reply({ flags: MessageFlags.Ephemeral, ...res });
                }
            }
        };
    };
}
