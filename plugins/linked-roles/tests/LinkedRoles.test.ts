import { MemoryDriver } from '@seedcord/core';
import { bindEnv } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { Envapter, PortableSource } from 'envapt';
import { describe, expect, it } from 'vite-plus/test';

import { LinkedRoles, RecordType } from '#src/index';

import { SERVER_URL_UNSET, TestHost } from './host';

import type { LinkedRoleRecords } from '#src/index';

const level = { type: RecordType.IntegerGreaterThanOrEqual, name: 'Level', description: 'Your level' } as const;

describe('LinkedRoles startup', () => {
    interface Start {
        host?: Partial<ConstructorParameters<typeof TestHost>[0]>;
        env?: Record<string, string>;
        records?: LinkedRoleRecords;
        keepTokens?: boolean;
    }

    function initError({
        host,
        env = { DISCORD_CLIENT_SECRET: 's' },
        records = { level },
        keepTokens = false
    }: Start = {}): unknown {
        const Attached = LinkedRoles.with({ records, keepTokens, values: () => 'Not yet.' });
        const { linkedRoles } = new TestHost({ api: 'http://discord.test/api', ...host }).attach(
            'linkedRoles',
            Attached
        );
        using _env = bindEnv(Envapter, new PortableSource(env));
        try {
            linkedRoles.init();
            return undefined;
        } catch (error) {
            return error;
        }
    }

    it("starts on the default in-memory `kv` when it doesn't keep tokens", () => {
        expect(initError({ host: { kv: new MemoryDriver() } })).toBeUndefined();
    });

    it("stops when the bot doesn't set `server.url`", () => {
        expect(initError({ host: { url: SERVER_URL_UNSET } })).toMatchObject({
            code: SeedcordErrorCode.CoreServerUrlUnset
        });
    });

    it('stops when `DISCORD_CLIENT_SECRET` is unset', () => {
        const error = initError({ env: {} });

        expect(error).toMatchObject({ code: SeedcordErrorCode.ConfigMissingEnv });
        expect(String(error)).toContain('DISCORD_CLIENT_SECRET');
    });

    it("stops on records that break one of Discord's limits", () => {
        const error = initError({ records: { 'top-level': level } });

        expect(error).toMatchObject({ code: SeedcordErrorCode.PluginOptionsRejected });
        expect(String(error)).toContain('top-level');
    });

    it('stops when it keeps tokens and `kv` is the default in-memory driver', () => {
        expect(initError({ keepTokens: true, host: { kv: new MemoryDriver() } })).toMatchObject({
            code: SeedcordErrorCode.PluginOAuthTokensInMemory
        });
    });

    it('starts when it keeps tokens in a `kv` that saves them', () => {
        expect(initError({ keepTokens: true })).toBeUndefined();
    });

    it('attaches as a class called `LinkedRoles`, the name that the logger shows', () => {
        expect(LinkedRoles.with({ records: { level }, values: () => 'Not yet.' }).name).toBe('LinkedRoles');
    });
});
