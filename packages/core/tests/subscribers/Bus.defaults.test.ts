import { describe, it, expect } from 'vite-plus/test';

import { Bus } from '#subscribers/index';
import { RegisterDefaults, RegisteredCount } from '#subscribers/slots';

import type { CoreBase } from '#interfaces/CoreBase';

// justified: the Bus only stores core, no member is read during construction
function stubBus(): Bus {
    return new Bus({} as unknown as CoreBase);
}

describe('Bus default reporters', () => {
    // a reporter url error escapes before start() can reset the guard because construction runs inside
    // the host constructor, past the point that sets the singleton guard
    it('waits for the host to ask before it registers the defaults', () => {
        const bus = stubBus();
        expect(bus[RegisteredCount]).toBe(0);

        bus[RegisterDefaults]();
        expect(bus[RegisteredCount]).toBe(2);
    });
});
