import { Bus } from '#subscribers/Bus';
import { RegisterSubscriber } from '#subscribers/slots';

import type { CoreBase } from '#interfaces/CoreBase';
import type { StoredSubscriberCtor } from '#subscribers/Bus';

export function busWith(...ctors: StoredSubscriberCtor[]): Bus {
    // justified: the Bus only stores core, no member is read during publish
    const bus = new Bus({} as CoreBase);
    for (const ctor of ctors) bus[RegisterSubscriber](ctor);
    return bus;
}
