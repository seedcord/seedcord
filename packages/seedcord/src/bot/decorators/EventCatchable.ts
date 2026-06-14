import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/services';
import { Message, MessageFlags } from 'discord.js';

import { Halt } from '@interfaces/Halt';
import { extractErrorResponse } from '@src/miscellaneous/extractErrorResponse';

import type { EventHandler } from '@handlers/event';
import type { RepliableEventHandler } from '@handlers/repliable';
import type { Denial } from '@interfaces/Components';
import type { ReplyResponse } from '@seedcord/types';
import type { ClientEvents } from 'discord.js';
import type { NonEmptyTuple } from 'type-fest';

const logger = new Logger('EventCatchable');

/**
 * Configuration options for the EventCatchable decorator.
 */
export interface EventCatchableOptions {
    /** Whether to log caught errors via the framework Logger {@default false} */
    log?: boolean;
    /**
     * Whether to fail silently without trying to send a message {@default false}.
     *
     * Can pass a list of {@link Denial} types to only silence those specific errors.
     */
    silent?: boolean | NonEmptyTuple<typeof Denial>;
}

function isSilenced(silent: boolean | NonEmptyTuple<typeof Denial>, err: Error): boolean {
    if (typeof silent === 'boolean') return silent;
    return silent.some((errorType) => err instanceof errorType);
}

async function replyToMessage(message: Message, response: ReplyResponse): Promise<void> {
    if (response.kind === 'v2') {
        await message.reply({ flags: MessageFlags.IsComponentsV2, components: response.components });
        return;
    }
    await message.reply(
        response.content === undefined
            ? { embeds: response.embeds }
            : { embeds: response.embeds, content: response.content }
    );
}

/**
 * Catches and handles errors in event handler methods.
 *
 * Catches errors thrown in event handlers and sends error responses
 * if the event contains a Discord message object.
 *
 * @param options - Configuration for error handling behavior
 * @see {@link EventCatchableOptions}
 * @decorator
 * @example
 * ```typescript
 * class MessageHandler extends EventHandler {
 *   \@EventCatchable({ log: true, silent: [MyDenial] })
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
                if (err instanceof Halt) {
                    if (err.reason !== undefined) logger.debug(`Halt: ${err.reason}`);
                    return;
                }
                if (!(err instanceof Error)) throw err;

                this.setErrored();
                if (log) logger.error('Caught event handler error', err);

                const eventArgs = Array.isArray(this.getEvent()) ? (this.getEvent() as unknown[]) : [this.getEvent()];
                const msg = eventArgs.find((x): x is Message => x instanceof Message);

                const { response } = extractErrorResponse(err, this.core, {
                    guild: msg?.guild ?? null,
                    user: msg?.author ?? null,
                    metadata: eventArgs
                });

                if (isSilenced(silent, err)) return;
                if (!msg) return;

                await replyToMessage(msg, response);
            }
        };
    };
}
