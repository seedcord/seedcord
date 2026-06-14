import * as crypto from 'node:crypto';

import { Logger } from '@seedcord/services';

import { slashRouteOf } from '@bot/utilities/miscellaneous/slashRouteOf';
import { Denial, DenialEmbed } from '@interfaces/Components';

import type { Repliables } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';
import type { RenderContext, ReplyResponse, Nullable } from '@seedcord/types';
import type { InteractionFaultSource } from '@subscribers/types/Subscriptions';
import type { Guild, User } from 'discord.js';
import type { UUID } from 'node:crypto';

const logger = new Logger('ErrorsHandling');

/**
 * Where an error came from. The interaction is present on the interaction path and sets the
 * `handledException` source. guild/user/metadata back the `unknownException` payload on every path.
 *
 * @internal
 */
export interface ErrorOrigin {
    interaction?: Repliables;
    guild: Nullable<Guild>;
    user: Nullable<User>;
    metadata?: unknown;
}

/**
 * Structure representing the extracted error response.
 *
 * @internal
 */
export interface ExtractedErrorResponse {
    /** The unique identifier for the error instance */
    uuid: UUID;
    /** The rendered reply to send to the user */
    response: ReplyResponse;
}

/**
 * Processes an error into a user-facing reply and routes its report.
 *
 * A {@link Denial} always renders its own reply. A reporting denial (`report: true`) additionally
 * publishes `handledException` on the interaction path. A raw, non-denial throw publishes
 * `unknownException` and renders the configured `defaultError` (or {@link GenericError}). One uuid is
 * threaded into both the reply and the bus payload.
 *
 * @internal
 */
export function extractErrorResponse(error: Error, core: Core, origin: ErrorOrigin): ExtractedErrorResponse {
    const uuid = crypto.randomUUID();
    const ctx: RenderContext = { uuid };

    if (error instanceof Denial) {
        if (error.report) reportDenial(error, core, origin, uuid);
        return { uuid, response: error.render(ctx) };
    }

    const showStack = core.config.errors?.errorStack ?? false;
    if (showStack) logger.error(uuid, error);
    else logger.error(`${uuid} | ${error.message}`);

    core.bus.publish('unknownException', {
        uuid,
        error,
        guild: origin.guild,
        user: origin.user,
        metadata: origin.metadata
    });

    const override = core.config.errors?.defaultError;
    const response = override
        ? new override(uuid).render(ctx)
        : new GenericError(uuid, core.config.notifications?.developerUsername).render();

    return { uuid, response };
}

function reportDenial(denial: Denial, core: Core, origin: ErrorOrigin, uuid: UUID): void {
    logger.error(`${denial.name}: ${uuid}`, denial);

    if (origin.interaction) {
        core.bus.publish('handledException', { denial, uuid, source: buildInteractionSource(origin.interaction) });
        return;
    }

    // No interaction to build a typed source (the event path), so report through unknownException until
    // the event boundary lands its own source arm.
    core.bus.publish('unknownException', {
        uuid,
        error: denial,
        guild: origin.guild,
        user: origin.user,
        metadata: origin.metadata
    });
}

function buildInteractionSource(interaction: Repliables): InteractionFaultSource {
    // the full slash route (with subcommand) so two subcommands of one parent do not share a key
    const command = interaction.isChatInputCommand()
        ? slashRouteOf(interaction)
        : interaction.isContextMenuCommand()
          ? interaction.commandName
          : null;
    const customId =
        interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()
            ? interaction.customId
            : null;

    return {
        kind: 'interaction',
        interactionKind: interactionKind(interaction),
        command,
        customId,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        interactionId: interaction.id,
        raw: interaction
    };
}

function interactionKind(interaction: Repliables): InteractionFaultSource['interactionKind'] {
    if (interaction.isChatInputCommand()) return 'slash';
    if (interaction.isContextMenuCommand()) return 'context-menu';
    if (interaction.isButton()) return 'button';
    if (interaction.isAnySelectMenu()) return 'select';
    return 'modal';
}

/**
 * Generic error shown to users when an unknown error occurs.
 *
 * Set `notifications.developerUsername` in your Seedcord config to customize the contact name.
 *
 * @internal
 */
export class GenericError extends Denial {
    constructor(
        private readonly uuid: UUID,
        private readonly developerUsername = 'the developer'
    ) {
        super('An unknown error occurred');
    }

    render(): ReplyResponse {
        const embed = new DenialEmbed(
            `An unknown error occurred. Please reach out to ${this.developerUsername} with a way to reproduce the error and the following:\n` +
                `### UUID: \`${this.uuid}\``,
            'Error'
        );
        return { kind: 'embed', embeds: [embed.component] };
    }
}
