import { describe, it, expect } from 'vitest';

import { Bus } from '#subscribers/index';
import { RegisterDefaults, RegisteredCount } from '#subscribers/slots';

import type { CoreBase } from '#interfaces/CoreBase';

// justified: the Bus only stores core, no member is read during construction
function stubBus(): Bus {
    return new Bus({} as unknown as CoreBase);
}

describe('Bus default reporters', () => {
    // construction runs inside the host constructor, past the point that arms the singleton guard, so a
    // reporter url error there escapes before start() can reset it
    it('registers nothing until the host asks for the defaults', () => {
        const bus = stubBus();
        expect(bus[RegisteredCount]).toBe(0);

        bus[RegisterDefaults]();
        expect(bus[RegisteredCount]).toBe(2);
    });
});
