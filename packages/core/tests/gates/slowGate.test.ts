import { captureLogs } from '@seedcord/logger/internal';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { slowGateMonitor } from '#gates/slowGate';

afterEach(() => {
    Envapter.useSource(new PortableSource({}));
});

describe('slowGateMonitor', () => {
    it('returns undefined in production', () => {
        Envapter.useSource(new PortableSource({ ENVIRONMENT: 'production' }));
        expect(slowGateMonitor()).toBeUndefined();
    });

    it('warns once with the total, the route, and each gate share when the checks sum to the threshold', () => {
        using logs = captureLogs();
        const monitor = slowGateMonitor();
        monitor?.observe('first', 400);
        monitor?.observe('second', 350);
        monitor?.report('slash:daily');

        const warnings = logs.at('warn');
        expect(warnings).toHaveLength(1);
        const [message] = warnings;
        expect(message).toContain('750ms');
        expect(message).toContain('first');
        expect(message).toContain('second');
        expect(message).toContain('slash:daily');
    });

    it('is silent when the checks sum under the threshold', () => {
        using logs = captureLogs();
        const monitor = slowGateMonitor();
        monitor?.observe('first', 300);
        monitor?.observe('second', 300);
        monitor?.report(null);

        expect(logs.at('warn')).toEqual([]);
    });

    it('is silent without readings', () => {
        using logs = captureLogs();
        slowGateMonitor()?.report(null);

        expect(logs.at('warn')).toEqual([]);
    });
});
