import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, it, expect } from 'vitest';

import { Plugin } from '#src/plugin/Plugin';
import { TestPluginHost } from '#tests/utils/TestPluginHost';

class Anywhere extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

// a key built at runtime, past the compile gate
const widen = (value: string): string => value;

describe('a reserved framework channel as an attach key', () => {
    it('rejects a literal key', () => {
        const host = new TestPluginHost();

        // @ts-expect-error 'errors' is a reserved framework channel
        expect(() => host.attach('errors', Anywhere)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginReservedChannel })
        );
    });

    it('rejects a literal read off a const object', () => {
        const host = new TestPluginHost();
        const keys = { logs: 'events' } as const;

        // @ts-expect-error keys.logs is the literal 'events'
        expect(() => host.attach(keys.logs, Anywhere)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginReservedChannel })
        );
    });

    it('throws for a key widened to string', () => {
        const host = new TestPluginHost();

        expect(() => host.attach(widen('hmr'), Anywhere)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginReservedChannel })
        );
    });

    // 'plugins' is also a member on the host, which would otherwise report the key-exists code
    it('reports the reserved code for a channel that collides with a host member', () => {
        const host = new TestPluginHost();

        expect(() => host.attach(widen('plugins'), Anywhere)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginReservedChannel })
        );
        expect(() => host.attach(widen('plugins'), Anywhere)).toThrow(/plugins/u);
    });

    it('leaves a key outside the reserved set alone', () => {
        const host = new TestPluginHost();

        expect(host.attach('db', Anywhere).db).toBeInstanceOf(Anywhere);
    });
});
