import { SeedcordError, SeedcordErrorCode } from '@seedcord/services';
import { Message } from 'discord.js';

import { extractErrorResponse } from '@bUtilities/errors/extractErrorResponse';

import type { CustomError } from '@interfaces/Components';
import type { EventHandler, RepliableEventHandler } from '@interfaces/Handler';
import type { ClientEvents } from 'discord.js';
import type { NonEmptyTuple } from 'type-fest';

/**
 * Configuration options for the EventCatchable decorator.
 */
export interface EventCatchableOptions {
    /** Whether to log errors to console using console.error (default: `false`) */
    log?: boolean;
    /**
     * Whether to fail silently without trying to send a message (default: `false`).
     *
     * Can pass a list of {@link CustomError} types to only silence those specific errors.
     */
    silent?: boolean | NonEmptyTuple<typeof CustomError>;
}

/**
 * Catches and handles errors in event handler methods.
 *
 * Automatically handles errors in event handlers and sends error responses
 * if the event contains a Discord message object.
 *
 * @param options - Configuration for error handling behavior
 * @see {@link EventCatchableOptions}
 * @decorator
 * @example
 * ```typescript
 * class MessageHandler extends EventHandler {
 *   \@EventCatchable({ log: true, silent: [MyCustomError] })
 *   async execute() {
 *     // Event handling logic
 *   }
 * }
 * ```
 */
export function EventCatchable(options?: EventCatchableOptions) {
    return function (
        _target: RepliableEventHandler,
        _prop: string,
        descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<void>>
    ): void {
        const log = options?.log ?? false;
        const silent = options?.silent ?? false;
        const original = descriptor.value;

        descriptor.value = async function (this: EventHandler<keyof ClientEvents>, ...args: any[]): Promise<void> {
            if (!original) throw new SeedcordError(SeedcordErrorCode.DecoratorMethodNotFound);

            try {
                await original.apply(this, args);
            } catch (err) {
                if (!(err instanceof Error)) throw err;

                this.setErrored();
                // eslint-disable-next-line no-console
                if (log) console.error(err);

                if (typeof silent === 'boolean' && silent) return;
                if (typeof silent !== 'boolean' && silent.some((errorType) => err instanceof errorType)) {
                    return;
                }

                const eventArgs = Array.isArray(this.getEvent()) ? (this.getEvent() as unknown[]) : [this.getEvent()];
                const msg = eventArgs.find((x): x is Message => x instanceof Message);

                const { response } = extractErrorResponse(
                    err,
                    this.core,
                    msg?.guild ?? null,
                    msg?.author ?? null,
                    eventArgs
                );

                if (!msg) return;

                await msg.reply({ embeds: [response], components: [] });
            }
        };
    };
}
