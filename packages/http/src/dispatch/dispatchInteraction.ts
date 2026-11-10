import { DiscordAPIError } from '@discordjs/rest';
import { InteractionKind } from '@seedcord/core';
import { DispatchContext, InteractionRun, lazyLogger } from '@seedcord/core/internal';

import { autocompleteResponder } from '#reply/autocompleteResponder';
import { ReplySender } from '#reply/ReplySender';
import { interactionGateContext, interactionOrigin } from '#src/gates/context';

import { interactionFaultReport } from './interactionFaultReport';

import type { InteractionMiddlewareConstructor, ResolvedInteraction } from '#handlers/constructors';
import type { Core } from '#interfaces/Core';
import type { MiddlewareKind } from '@seedcord/core';
import type { InteractionDispatch, InteractionRunConfig, MiddlewareRegistry } from '@seedcord/core/internal';

const logger = lazyLogger('Interactions', { channel: 'interactions' });

interface DispatchArgs {
    readonly resolved: ResolvedInteraction;
    readonly core: Core;
    readonly middlewares: MiddlewareRegistry<InteractionMiddlewareConstructor>;
}

function autocompleteRunConfig(
    resolved: ResolvedInteraction<InteractionKind.Autocomplete>,
    core: Core
): InteractionRunConfig {
    const { event, ctor: Ctor } = resolved;
    const dispatch = dispatchOf(resolved);
    const responder = autocompleteResponder(event, core, dispatch);
    return runConfig(resolved, core, dispatch, {
        responder,
        handler: () => new Ctor(event, core, dispatch, responder)
    });
}

function repliableRunConfig<Kind extends MiddlewareKind>(
    resolved: ResolvedInteraction<Kind>,
    core: Core,
    middlewares: readonly InteractionMiddlewareConstructor[]
): InteractionRunConfig {
    const { event, ctor: Ctor } = resolved;
    const dispatch = dispatchOf(resolved);
    const ref = { application_id: event.application_id, id: event.id, token: event.token };
    const sender = new ReplySender(ref, core.rest, dispatch, core.bus);
    return runConfig(resolved, core, dispatch, {
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
    resolved: ResolvedInteraction<Kind>,
    core: Core,
    dispatch: InteractionDispatch,
    target: InteractionRunConfig['target']
): InteractionRunConfig {
    const { event, ctor } = resolved;
    return {
        dispatch,
        core,
        HandlerCtor: ctor,
        apiError: DiscordAPIError,
        logger: logger(),
        interactionId: event.id,
        origin: interactionOrigin(event),
        customId: 'custom_id' in event.data ? event.data.custom_id : null,
        faultDetails: () => interactionFaultReport(event, dispatch),
        target
    };
}

export function dispatchInteraction({
    resolved,
    core,
    middlewares
}: DispatchArgs): ReturnType<InteractionRun['prepare']> {
    const config =
        resolved.kind === InteractionKind.Autocomplete
            ? autocompleteRunConfig(resolved, core)
            : repliableRunConfig(resolved, core, middlewares.chainFor(resolved.kind));
    return new InteractionRun(config).prepare();
}
