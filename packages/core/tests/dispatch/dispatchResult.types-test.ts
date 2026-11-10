import { expectTypeOf } from 'vite-plus/test';

import type { DispatchResult, EventDispatchResult, HandlerOutcome, HandlerResult } from '#src/dispatch/dispatchResult';
import type { DispatchOutcome } from '#subscribers/types/Subscriptions';

// catches a fourth outcome added to DispatchOutcome and missed here
expectTypeOf<DispatchResult['outcome']>().toEqualTypeOf<DispatchOutcome>();
expectTypeOf<EventDispatchResult['outcome']>().toEqualTypeOf<DispatchOutcome>();

const interaction = {} as DispatchResult;

if (interaction.outcome === 'handled') {
    expectTypeOf(interaction).not.toHaveProperty('caught');
} else {
    expectTypeOf(interaction).toHaveProperty('caught').toEqualTypeOf<unknown>();
}

const fire = {} as EventDispatchResult;

if (fire.outcome === 'handled') {
    expectTypeOf(fire).not.toHaveProperty('caught');
    expectTypeOf(fire).toHaveProperty('handlers').toEqualTypeOf<readonly HandlerResult[]>();
} else {
    expectTypeOf(fire).toHaveProperty('caught').toEqualTypeOf<unknown>();
    expectTypeOf(fire).toHaveProperty('handlers').toEqualTypeOf<readonly []>();
}

const perHandler = {} as HandlerResult;

expectTypeOf(perHandler).toHaveProperty('handler').toEqualTypeOf<string>();
if (perHandler.outcome !== 'handled') {
    expectTypeOf(perHandler).toHaveProperty('caught').toEqualTypeOf<unknown>();
}

const published = {} as HandlerOutcome;

// the thrown value stays off the bus whichever way HandlerResult grows
expectTypeOf(published).not.toHaveProperty('caught');
expectTypeOf<HandlerOutcome['outcome']>().toEqualTypeOf<DispatchOutcome>();
