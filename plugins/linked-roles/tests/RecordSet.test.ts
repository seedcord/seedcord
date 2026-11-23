import { stripVTControlCharacters } from 'node:util';

import { SeedcordErrorCode } from '@seedcord/errors';
import { ApplicationRoleConnectionMetadataType as RecordType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vite-plus/test';

import { RecordSet } from '#src/RecordSet';

import type { LinkedRoleRecords } from '#src/LinkedRoleRecord';

const records = {
    merged_prs: {
        type: RecordType.IntegerGreaterThanOrEqual,
        name: 'Merged PRs',
        description: 'Pull requests merged',
        nameLocalizations: { fr: 'PR fusionnées' }
    },
    is_maintainer: { type: RecordType.BooleanEqual, name: 'Maintainer', description: 'Maintains seedcord' },
    first_merge: { type: RecordType.DatetimeGreaterThanOrEqual, name: 'Since', description: 'First merge' }
} satisfies LinkedRoleRecords;

const valid = { merged_prs: 12, is_maintainer: true, first_merge: new Date(0) };

const one = { type: RecordType.IntegerEqual, name: 'Level', description: 'Your level' };

describe('RecordSet', () => {
    it("accepts records that fit Discord's limits", () => {
        expect(new RecordSet(records).firstProblem()).toBeUndefined();
        expect(new RecordSet({ a: one, b: one, c: one, d: one, ['e'.repeat(50)]: one }).firstProblem()).toBeUndefined();
    });

    it.for<[what: string, wrong: LinkedRoleRecords, says: string]>([
        ['a sixth record', { a: one, b: one, c: one, d: one, e: one, f: one }, 'has 6 records'],
        ['an uppercase key', { Level: one }, "'Level' can only use"],
        ['an empty key', { '': one }, 'is empty'],
        ['a key of 51 characters', { ['k'.repeat(51)]: one }, 'has 51 characters'],
        ['an empty name', { level: { ...one, name: '' } }, 'name of the record level is empty'],
        ['a name of 101 characters', { level: { ...one, name: 'n'.repeat(101) } }, 'has 101 characters'],
        ['a description of 201 characters', { level: { ...one, description: 'd'.repeat(201) } }, 'has 201 characters']
    ])('reports %s', ([, wrong, says]) => {
        // the problem text has color codes around the names and numbers
        expect(stripVTControlCharacters(new RecordSet(wrong).firstProblem() ?? '')).toContain(says);
    });

    it("lists each record under its key, with Discord's field names", () => {
        expect(new RecordSet(records).recordsBody()).toEqual([
            {
                key: 'merged_prs',
                type: RecordType.IntegerGreaterThanOrEqual,
                name: 'Merged PRs',
                description: 'Pull requests merged',
                name_localizations: { fr: 'PR fusionnées' }
            },
            {
                key: 'is_maintainer',
                type: RecordType.BooleanEqual,
                name: 'Maintainer',
                description: 'Maintains seedcord'
            },
            {
                key: 'first_merge',
                type: RecordType.DatetimeGreaterThanOrEqual,
                name: 'Since',
                description: 'First merge'
            }
        ]);
    });

    it('sends an integer as digits, a `Date` as ISO 8601, and a boolean as 1 or 0', () => {
        const body = new RecordSet(records).connectionBody({
            platformName: 'seedcord',
            platformUsername: 'dhruv',
            metadata: { merged_prs: 12, is_maintainer: false, first_merge: new Date('2026-01-02T03:04:05Z') }
        });

        expect(body).toEqual({
            platform_name: 'seedcord',
            platform_username: 'dhruv',
            metadata: { merged_prs: '12', is_maintainer: '0', first_merge: '2026-01-02T03:04:05.000Z' }
        });
    });

    it.for<[what: string, wrong: Record<string, unknown>]>([
        ['a number with a fraction', { merged_prs: 1.5 }],
        ['a number that prints with an exponent', { merged_prs: 1e21 }],
        ['a date that never parsed', { first_merge: new Date('soon') }],
        ['text in a boolean record', { is_maintainer: 'yes' }],
        ['a missing value', { is_maintainer: undefined }],
        ['a key that no record has', { stars: 4 }],
        ['a key that every object inherits', { constructor: 4 }]
    ])('refuses %s', ([, wrong]) => {
        expect(() => new RecordSet(records).connectionBody({ metadata: { ...valid, ...wrong } })).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginLinkedRolesValueRejected })
        );
    });

    it.for([
        ['platformName', 51],
        ['platformUsername', 101]
    ] as const)('refuses a %s of %d characters', ([field, length]) => {
        expect(() => new RecordSet(records).connectionBody({ metadata: valid, [field]: 'x'.repeat(length) })).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginLinkedRolesValueRejected })
        );
    });
});
