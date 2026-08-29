import { expectTypeOf } from 'vitest';

import type { SubscriptionData } from '#subscribers/types/Subscriptions';

const payload = {} as SubscriptionData<'responseAttempted'>;

if (payload.outcome === 'failed') {
    expectTypeOf(payload).toHaveProperty('error').toEqualTypeOf<Error>();
    expectTypeOf(payload).toHaveProperty('messageId').toEqualTypeOf<null>();
} else {
    expectTypeOf(payload).not.toHaveProperty('error');
    expectTypeOf(payload).toHaveProperty('messageId').toEqualTypeOf<string | null>();
}
