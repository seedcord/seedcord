import { RESTJSONErrorCodes } from 'discord.js';

/**
 * Discord API error codes that mean a dead end on an interaction, a dead token, a double ack, or a gone
 * message. Nothing to show the user and no bug to report, so the boundary's fault-card send drops them.
 *
 * @internal
 */
export const HARMLESS_API_CODES: ReadonlySet<number | string> = new Set([
    RESTJSONErrorCodes.UnknownInteraction,
    RESTJSONErrorCodes.InteractionHasAlreadyBeenAcknowledged,
    RESTJSONErrorCodes.UnknownMessage
]);
