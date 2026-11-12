import { DispatchContext } from '@seedcord/core/internal';
import { DiscordAPIError } from 'discord.js';

import { autocompleteResponder } from '#bot/autocompleteResponder';
import { interactionGateContext, interactionOrigin } from '#bot/gates/context';
import { ReplySender } from '#bot/ReplySender';
import { interactionFaultReport } from '#miscellaneous/faultReports';

import type { InteractionMiddlewareConstructor, ResolvedInteraction } from '#handlers/constructors';
import type { Core } from '#interfaces/Core';
import type { InteractionKind, MiddlewareKind } from '@seedcord/core';
import type { InteractionDispatch, InteractionRunConfig } from '@seedcord/core/internal';
import type { Logger } from '@seedcord/logger';

interface GatewayRun<Kind extends InteractionKind> {
    readonly resolved: ResolvedInteraction<Kind>;
    readonly core: Core;
    readonly logger: Logger;
}

interface RepliableRun<Kind extends MiddlewareKind> extends GatewayRun<Kind> {
    readonly middlewares: readonly InteractionMiddlewareConstructor[];
}

export function autocompleteRunConfig(run: GatewayRun<InteractionKind.Autocomplete>): InteractionRunConfig {
    const { resolved, core } = run;
    const { event, ctor: Ctor } = resolved;
    const dispatch = dispatchOf(resolved);
    const responder = autocompleteResponder(event, core, dispatch);
    return runConfig(run, dispatch, { responder, handler: () => new Ctor(event, core, dispatch, responder) });
}

export function repliableRunConfig<Kind extends MiddlewareKind>(run: RepliableRun<Kind>): InteractionRunConfig {
    const { resolved, core, middlewares } = run;
    const { event, ctor: Ctor } = resolved;
    const dispatch = dispatchOf(resolved);
    const sender = new ReplySender(event, dispatch, core.bus);
    return runConfig(run, dispatch, {
        sender,
        gateContext: () => interactionGateContext(event, core, dispatch),
        handler: () => new Ctor(event, core, dispatch, sender),
        middlewares: middlewares.map((Middleware) => () => new Middleware(event, core, dispatch, sender))
    });
}

function dispatchOf<Kind extends InteractionKind>({
    kind,
    route,
    fallback
}: ResolvedInteraction<Kind>): InteractionDispatch {
    return new DispatchContext(kind, route, fallback);
}

function runConfig<Kind extends InteractionKind>(
    { resolved, core, logger }: GatewayRun<Kind>,
    dispatch: InteractionDispatch,
    target: InteractionRunConfig['target']
): InteractionRunConfig {
    const { event, ctor } = resolved;
    return {
        dispatch,
        core,
        HandlerCtor: ctor,
        apiError: DiscordAPIError,
        logger,
        interactionId: event.id,
        origin: interactionOrigin(event),
        customId: 'customId' in event ? event.customId : null,
        faultDetails: () => interactionFaultReport(event, dispatch),
        target
    };
}
