import { Halt } from '@seedcord/kit';
import { Logger } from '@seedcord/services';
import { DiscordAPIError } from 'discord.js';

import { ReplySender } from '@bot/ReplySender';
import { slashRouteOf } from '@bUtilities/miscellaneous/slashRouteOf';
import { extractErrorResponse } from '@miscellaneous/extractErrorResponse';

import type { ValidInteractionTypes } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';

const logger = new Logger('InteractionBoundary');

/**
 * The interaction controller boundary. Sorts a throw from any handler-lifecycle phase into the right
 * user reply plus the right bus event, building a {@link ReplySender} lazily so it reads the live
 * acknowledgement state at catch time.
 *
 * @internal
 */
export async function handleInteractionFault(
    caught: unknown,
    interaction: ValidInteractionTypes,
    core: Core
): Promise<void> {
    if (caught instanceof Halt) {
        if (caught.reason !== undefined) logger.debug(`Halt: ${caught.reason}`);
        return;
    }
    if (!(caught instanceof Error)) throw caught;

    // empty by default, so every api code from the handler's own work reports. the reply sender swallows
    // the harmless reply-token codes on its own send regardless, see HARMLESS_API_CODES.
    const ignore = new Set<number | string>(core.config.errors?.ignoreApiCodes ?? []);
    if (caught instanceof DiscordAPIError && ignore.has(caught.code)) {
        logger.debug(`swallowed api code ${caught.code}`);
        return;
    }

    // autocomplete has no reply target, so report through extractErrorResponse and build no sender
    if (interaction.isAutocomplete()) {
        extractErrorResponse(caught, core, {
            guild: interaction.guild,
            user: interaction.user,
            metadata: interaction,
            route: slashRouteOf(interaction)
        });
        return;
    }

    const { response } = extractErrorResponse(caught, core, {
        interaction,
        guild: interaction.guild,
        user: interaction.user,
        metadata: interaction
    });
    await new ReplySender(interaction).send(response);
}
