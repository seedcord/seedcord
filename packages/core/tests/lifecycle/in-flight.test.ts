import { setTimeout } from 'node:timers/promises';

import { Logger } from '@seedcord/logger';
import { describe, expect, it } from 'vite-plus/test';

import { InFlight } from '#src/lifecycle/InFlight';
import { keepRequestOpenFor } from '#src/requestScope';

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

    it('drains what admitted work kept open after it returned', async () => {
        const inFlight = new InFlight(new Logger('Test'), 'Test');
        inFlight.open();
        const finished: string[] = [];

        await inFlight.admit(() => {
            keepRequestOpenFor(setTimeout(WORK_MS).then(() => finished.push('kept open')));
            return Promise.resolve();
        });
        await inFlight.drain(WINDOW_MS);

        expect(finished).toEqual(['kept open']);
    });

    it('lets running work finish before a pause, then holds new work until resume', async () => {
        const inFlight = new InFlight(new Logger('Test'), 'Test');
        inFlight.open();
        const order: string[] = [];

        void inFlight.admit(() => setTimeout(WORK_MS).then(() => order.push('running')));
        const resume = await inFlight.pause(WINDOW_MS);
        order.push('paused');
        const held = inFlight.admit(() => Promise.resolve(order.push('held')));
        order.push('resumed');
        resume();
        await held;

        expect(order).toEqual(['running', 'paused', 'resumed', 'held']);
    });
});
