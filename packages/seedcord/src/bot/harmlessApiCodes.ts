import { RESTJSONErrorCodes } from 'discord.js';

/**
 * Discord API error codes that mean a dead end on an interaction, a dead token, a double ack, or a gone
 * message. There is nothing to show the user and no bug to report. The controller boundary drops them on
 * the original throw, and {@link ReplySender} drops them on its own send.
 *
 * @internal
 */
export const HARMLESS_API_CODES: ReadonlySet<number | string> = new Set([
    RESTJSONErrorCodes.UnknownInteraction,
    RESTJSONErrorCodes.InteractionHasAlreadyBeenAcknowledged,
    RESTJSONErrorCodes.UnknownMessage
]);
