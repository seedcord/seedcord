import { expectTypeOf } from 'vite-plus/test';

import type { SubscriptionData } from '#subscribers/types/Subscriptions';
import type { APIMessageTopLevelComponent, APIModalInteractionResponseCallbackData } from 'discord-api-types/v10';

const payload = {} as SubscriptionData<'responseAttempted'>;

if (payload.outcome === 'failed') {
    expectTypeOf(payload).toHaveProperty('error').toEqualTypeOf<Error>();
    expectTypeOf(payload).toHaveProperty('messageId').toEqualTypeOf<null>();
} else {
    expectTypeOf(payload).not.toHaveProperty('error');
    expectTypeOf(payload).toHaveProperty('messageId').toEqualTypeOf<string | null>();
}

if (payload.method === 'showModal') {
    expectTypeOf(payload.body).toEqualTypeOf<APIModalInteractionResponseCallbackData | null>();
}

if (payload.method === 'reply' && payload.outcome === 'sent') {
    expectTypeOf(payload.body.components).toEqualTypeOf<APIMessageTopLevelComponent[]>();
}

if (payload.method === 'defer' || payload.method === 'respond') {
    expectTypeOf(payload.body).toEqualTypeOf<null>();
}
