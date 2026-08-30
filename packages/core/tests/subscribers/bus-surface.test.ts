import { describe, it, expect } from 'vitest';

import { Bus } from '#subscribers/index';

import type { CoreBase } from '#interfaces/CoreBase';

// justified: the Bus only stores core, no member is read during construction
function stubBus(): Bus {
    return new Bus({} as unknown as CoreBase);
}

describe('the Bus surface a bot author reaches', () => {
    it('names publish and nothing else', () => {
        const bus = stubBus();

        for (const name of ['register', 'unregister', 'registerDefaults', 'verifyWebhooks', 'registeredCount']) {
            expect(name in bus).toBe(false);
        }
        expect(typeof bus.publish).toBe('function');
    });
});
