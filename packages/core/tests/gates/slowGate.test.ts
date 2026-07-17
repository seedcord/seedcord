import { Logger } from '@seedcord/logger';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { slowGateObserver } from '@gates/slowGate';

afterEach(() => {
    vi.restoreAllMocks();
    Envapter.useSource(new PortableSource({}));
});

describe('slowGateObserver', () => {
    it('returns undefined in production', () => {
        Envapter.useSource(new PortableSource({ ENVIRONMENT: 'production' }));
        expect(slowGateObserver()).toBeUndefined();
    });

    it('warns naming the gate when a check reaches the threshold', () => {
        const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        slowGateObserver()?.('slowgate', 750);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0]?.[0]).toContain('slowgate');
    });

    it('stays silent under the threshold', () => {
        const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        slowGateObserver()?.('fastgate', 749);
        expect(warn).not.toHaveBeenCalled();
    });
});
