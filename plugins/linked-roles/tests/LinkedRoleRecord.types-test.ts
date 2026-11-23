import { ApplicationRoleConnectionMetadataType as MetadataType } from 'discord-api-types/v10';
import { expectTypeOf } from 'vite-plus/test';

import type { LinkedRoleRecords, RecordProblems, RoleMetadata } from '#src/LinkedRoleRecord';

// a function gets the limit errors by taking its records this way
declare function checked<const TRecords extends LinkedRoleRecords>(
    records: TRecords & RecordProblems<TRecords>
): RoleMetadata<TRecords>;

const one = { type: MetadataType.IntegerEqual, name: 'Level', description: 'Your level' } as const;

function typesEachValueByItsRecord(): void {
    const metadata = checked({
        merged_prs: { type: MetadataType.IntegerGreaterThanOrEqual, name: 'Merged PRs', description: 'PRs merged' },
        is_maintainer: { type: MetadataType.BooleanNotEqual, name: 'Maintainer', description: 'Maintains seedcord' },
        first_merge: { type: MetadataType.DatetimeLessThanOrEqual, name: 'Since', description: 'First merge' }
    });

    expectTypeOf(metadata).toEqualTypeOf<{ merged_prs: number; is_maintainer: boolean; first_merge: Date }>();
}

function rejectsWhatDiscordRejects(): void {
    checked({ a: one, b: one, c: one, d: one, e: one });
    // @ts-expect-error six records
    checked({ a: one, b: one, c: one, d: one, e: one, f: one });

    checked({ level_2: one });
    checked({
        // @ts-expect-error an uppercase letter
        Level: one
    });
    checked({
        // @ts-expect-error a dash in the key
        'top-level': one
    });
    checked({
        // @ts-expect-error 51 characters
        a23456789_b23456789_c23456789_d23456789_e23456789_f: one
    });

    checked({
        level: {
            type: MetadataType.IntegerEqual,
            // @ts-expect-error 101 characters
            name: '01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890',
            description: 'Your level'
        }
    });
    checked({
        level: {
            type: MetadataType.IntegerEqual,
            name: 'Level',
            // @ts-expect-error 201 characters
            description:
                '012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890'
        }
    });
}

function leavesTextItCannotReadToTheRuntimeCheck(name: string, records: LinkedRoleRecords): void {
    checked({ level: { type: MetadataType.IntegerEqual, name, description: 'Your level' } });
    checked(records);
}

void typesEachValueByItsRecord;
void rejectsWhatDiscordRejects;
void leavesTextItCannotReadToTheRuntimeCheck;
