// compile-only. tc fails on any unused @ts-expect-error below.
import { expectTypeOf } from 'vite-plus/test';

import { LinkedRoles, RecordType } from '#src/index';

import type { LinkedRoleRecords, LinkedRolesResult } from '#src/index';
import type { PluginHost } from '@seedcord/core/plugin';
import type { APIUser, RESTGetAPICurrentUserConnectionsResult } from 'discord-api-types/v10';

declare const gateway: PluginHost<'gateway', 'server'>;
declare const edge: PluginHost<'http', 'edge'>;

const one = { type: RecordType.IntegerEqual, name: 'Level', description: 'Your level' } as const;
const records = {
    merged_prs: { type: RecordType.IntegerGreaterThanOrEqual, name: 'Merged PRs', description: 'PRs merged' },
    is_maintainer: { type: RecordType.BooleanNotEqual, name: 'Maintainer', description: 'Maintains seedcord' },
    first_merge: { type: RecordType.DatetimeLessThanOrEqual, name: 'Since', description: 'First merge' }
} as const;
const metadata = { merged_prs: 3, is_maintainer: true, first_merge: new Date() };

function typesWhatValuesGets(): void {
    LinkedRoles.with({
        records,
        scopes: ['connections'],
        values: ({ user, discord }) => {
            expectTypeOf(user).toEqualTypeOf<APIUser>();
            expectTypeOf(discord.connections()).resolves.toEqualTypeOf<RESTGetAPICurrentUserConnectionsResult>();
            // @ts-expect-error guilds isn't in scopes
            void discord.guilds();
            return { platformUsername: user.username, metadata };
        }
    });
    LinkedRoles.with({
        records,
        values: ({ discord }) => {
            // @ts-expect-error connections needs the scope
            void discord.connections();
            return { metadata };
        }
    });
}

function typesWhatValuesReturns(): void {
    LinkedRoles.with({ records, values: () => 'Use the bot once, then try again.' });
    LinkedRoles.with({
        records,
        // @ts-expect-error merged_prs is an integer record
        values: () => ({ metadata: { ...metadata, merged_prs: 'three' } })
    });
    LinkedRoles.with({
        records,
        // @ts-expect-error first_merge is missing
        values: () => ({ metadata: { merged_prs: 3, is_maintainer: true } })
    });
}

function typesWhatOnResultGets(): void {
    LinkedRoles.with({
        records,
        values: () => ({ metadata }),
        onResult: (result, request) => {
            expectTypeOf(result).toEqualTypeOf<LinkedRolesResult>();
            expectTypeOf(request).toEqualTypeOf<Request>();
            return new Response();
        }
    });
}

function rejectsWhatDiscordRejects(): void {
    LinkedRoles.with({
        records: { a: one, b: one, c: one, d: one, e: one },
        values: () => ({ metadata: { a: 1, b: 1, c: 1, d: 1, e: 1 } })
    });
    LinkedRoles.with({
        // @ts-expect-error six records
        records: { a: one, b: one, c: one, d: one, e: one, f: one },
        values: () => ({ metadata: { a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 } })
    });
    LinkedRoles.with({
        records: {
            // @ts-expect-error an uppercase letter
            Level: one
        },
        values: () => ({ metadata: { Level: 1 } })
    });
    LinkedRoles.with({
        records: {
            // @ts-expect-error a dash in the key
            'top-level': one
        },
        values: () => ({ metadata: { 'top-level': 1 } })
    });
    LinkedRoles.with({
        records: {
            // @ts-expect-error 51 characters
            a23456789_b23456789_c23456789_d23456789_e23456789_f: one
        },
        values: () => ({ metadata: { a23456789_b23456789_c23456789_d23456789_e23456789_f: 1 } })
    });
    LinkedRoles.with({
        records: {
            level: {
                type: RecordType.IntegerEqual,
                // @ts-expect-error 101 characters
                name: '01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890',
                description: 'Your level'
            }
        },
        values: () => ({ metadata: { level: 1 } })
    });
    LinkedRoles.with({
        records: {
            level: {
                type: RecordType.IntegerEqual,
                name: 'Level',
                // @ts-expect-error 201 characters
                description:
                    '012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890'
            }
        },
        values: () => ({ metadata: { level: 1 } })
    });
}

function leavesTextItCannotReadToTheRuntimeCheck(name: string, loose: LinkedRoleRecords): void {
    LinkedRoles.with({
        records: { level: { type: RecordType.IntegerEqual, name, description: 'Your level' } },
        values: () => ({ metadata: { level: 1 } })
    });
    LinkedRoles.with({ records: loose, values: () => 'Not yet.' });
}

function attachesOnEveryRuntime(): void {
    const Attached = LinkedRoles.with({ records, values: () => ({ metadata }) });
    void gateway.attach('linkedRoles', Attached);
    void edge.attach('linkedRoles', Attached);
    // @ts-expect-error LinkedRoles is abstract. attach what LinkedRoles.with() returns
    void gateway.attach('linkedRoles', LinkedRoles);
}

void typesWhatValuesGets;
void typesWhatValuesReturns;
void typesWhatOnResultGets;
void rejectsWhatDiscordRejects;
void leavesTextItCannotReadToTheRuntimeCheck;
void attachesOnEveryRuntime;
