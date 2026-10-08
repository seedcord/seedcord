import { setTimeout } from 'node:timers/promises';

import { Logger } from '@seedcord/logger';
import { describe, expect, it } from 'vitest';

import { InFlight } from '#node/Lifecycle/InFlight';

const WORK_MS = 20;
const WINDOW_MS = 1000;

describe('InFlight', () => {
    it('drains work tracked while the drain is already waiting', async () => {
        const inFlight = new InFlight(new Logger('Test'), 'Test');
        const finished: string[] = [];

        inFlight.track(
            setTimeout(WORK_MS).then(() => {
                inFlight.track(setTimeout(WORK_MS).then(() => finished.push('second')));
                finished.push('first');
            })
        );
        await inFlight.drain(WINDOW_MS);

        expect(finished).toEqual(['first', 'second']);
    });
});
