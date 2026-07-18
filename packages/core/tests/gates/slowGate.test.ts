import { Logger } from '@seedcord/logger';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { slowGateMonitor } from '@gates/slowGate';

afterEach(() => {
    vi.restoreAllMocks();
    Envapter.useSource(new PortableSource({}));
});

function warnSpy(): MockInstance<Logger['warn']> {
    return vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
}

describe('slowGateMonitor', () => {
    it('returns undefined in production', () => {
        Envapter.useSource(new PortableSource({ ENVIRONMENT: 'production' }));
        expect(slowGateMonitor()).toBeUndefined();
    });

    it('warns once with the total, the route, and each gate share when the checks sum to the threshold', () => {
        const warn = warnSpy();
        const monitor = slowGateMonitor();
        monitor?.observe('first', 400);
        monitor?.observe('second', 350);
        monitor?.report('slash:daily');

        expect(warn).toHaveBeenCalledTimes(1);
        const message = warn.mock.calls[0]?.[0] ?? '';
        expect(message).toContain('750ms');
        expect(message).toContain('first');
        expect(message).toContain('second');
        expect(message).toContain('slash:daily');
    });

    it('stays silent when the checks sum under the threshold', () => {
        const warn = warnSpy();
        const monitor = slowGateMonitor();
        monitor?.observe('first', 300);
        monitor?.observe('second', 300);
        monitor?.report(null);

        expect(warn).not.toHaveBeenCalled();
    });

    it('stays silent with no readings', () => {
        const warn = warnSpy();
        slowGateMonitor()?.report(null);

        expect(warn).not.toHaveBeenCalled();
    });
});
