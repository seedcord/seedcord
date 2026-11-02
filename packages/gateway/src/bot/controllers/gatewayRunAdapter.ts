import { runInteractionGates } from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';

import { interactionGateContext } from '#bot/gates/context';
import { handleInteractionFault } from '#bot/handleInteractionFault';
import { RepliableHandler } from '#handlers/RepliableHandler';

import type { ReplySender } from '#bot/ReplySender';
import type {
    ConstructableHandler,
    HandlerConstructor,
    InteractionMiddlewareConstructor
} from '#handlers/constructors';
import type { InteractionOf } from '#handlers/interaction/middlewareKinds';
import type { Core } from '#interfaces/Core';
import type { Repliables, ValidInteractionTypes } from '#src/handlers/interactionTypes';
import type { MiddlewareKind } from '@seedcord/core';
import type { InteractionDispatch, InteractionRunAdapter, MiddlewareRegistry } from '@seedcord/core/internal';
import type { Logger } from '@seedcord/logger';
import type { Interaction } from 'discord.js';

interface GatewayRun {
    readonly interaction: Interaction;
    readonly core: Core;
    readonly dispatch: InteractionDispatch;
    readonly HandlerCtor: HandlerConstructor;
    readonly middlewares: MiddlewareRegistry<InteractionMiddlewareConstructor>;
    readonly logger: Logger;
}

export function gatewayRunAdapter(run: GatewayRun): InteractionRunAdapter<ReplySender> {
    const { interaction, core, dispatch, HandlerCtor, middlewares, logger } = run;
    return {
        dispatch,
        logger,
        bus: core.bus,
        interactionId: interaction.id,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        buildHandler() {
            const { route } = dispatch;
            if (dispatch.fallback) {
                logger.warn(`No handler found for key ${paint.sky.bold(route)}. Falling back to ${HandlerCtor.name}.`);
            }
            logger.trace(`Processing ${paint.sky.bold(route)} with ${paint.mute(HandlerCtor.name)}`);
            // in a union of both handler bases, the event parameter is never. the maps pair each kind with its class.
            return new (HandlerCtor as ConstructableHandler)(interaction as never, core, dispatch);
        },
        senderOf: (handler) => (handler instanceof RepliableHandler ? handler.sender : undefined),
        *middlewares(kind, sender) {
            for (const Middleware of middlewares.chainFor(kind)) {
                // chainFor picked this kind. the interaction is the one the class declares.
                yield new Middleware(interaction as InteractionOf<MiddlewareKind>, core, dispatch, sender);
            }
        },
        runGates: () =>
            runInteractionGates(HandlerCtor, interactionGateContext(interaction as Repliables, core, dispatch)),
        answer: (caught, sender) =>
            handleInteractionFault(caught, interaction as ValidInteractionTypes, core, dispatch, sender)
    };
}
