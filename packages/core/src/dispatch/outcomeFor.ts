import { Notice } from '#stops/Notice';
import { Silence } from '#stops/Silence';

import type { DispatchOutcome } from '#subscribers/types/Subscriptions';
import type { ExcludeStrict } from 'type-fest';

export function outcomeFor(caught: unknown): ExcludeStrict<DispatchOutcome, 'handled'> {
    if (caught instanceof Silence) return 'refused';
    if (caught instanceof Notice) return caught.report ? 'failed' : 'refused';
    return 'failed';
}
