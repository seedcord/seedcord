import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordRangeError, SeedcordTypeError } from '@seedcord/errors/internal';
import { keepDefined } from '@seedcord/utils';
import { difference, mapValues } from 'es-toolkit';

import { DISCORD_LIMITS, RECORD_KINDS } from './LinkedRoleRecord';

import type {
    LinkedRoleRecord,
    LinkedRoleRecords,
    PlatformField,
    RecordKind,
    RoleConnection,
    RoleMetadata,
    TextField
} from './LinkedRoleRecord';
import type {
    RESTPutAPIApplicationRoleConnectionMetadataJSONBody,
    RESTPutAPICurrentUserApplicationRoleConnectionJSONBody
} from 'discord-api-types/v10';

interface KindFormat {
    // undefined for a value of the wrong kind
    text(value: unknown): string | undefined;
    needs: string;
}

const KIND_FORMATS = {
    integer: {
        // isInteger passes 1e21, which prints as 1e+21
        text: (value) => (Number.isSafeInteger(value) ? String(value) : undefined),
        needs: 'An integer record needs a whole number.'
    },
    datetime: {
        text: (value) => (value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : undefined),
        needs: `A datetime record needs a valid ${paint.bold('Date')}.`
    },
    boolean: {
        text: (value) => (typeof value === 'boolean' ? (value ? '1' : '0') : undefined),
        needs: 'A boolean record needs true or false.'
    }
} satisfies Record<RecordKind, KindFormat>;

// what the error says `values` returned. String() would print a missing value as "undefined" and
// an object as "[object Object]"
function shown(value: unknown): string {
    if (value === undefined) return 'nothing';
    if (value === null) return 'null';
    if (typeof value === 'string') return paint.sky(JSON.stringify(value));
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return paint.iris(String(value));
    }
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? 'an invalid Date' : 'a Date';
    return typeof value === 'object' ? 'an object' : `a ${typeof value}`;
}

function rejected(key: string, value: unknown, fix: string): SeedcordTypeError {
    return new SeedcordTypeError(SeedcordErrorCode.PluginLinkedRolesValueRejected, [key, shown(value), fix]);
}

function withinLimit(field: PlatformField, text: string | undefined): string | undefined {
    const max = DISCORD_LIMITS[field];
    if (text !== undefined && text.length > max) {
        throw new SeedcordRangeError(SeedcordErrorCode.PluginLinkedRolesValueRejected, [
            field,
            `${paint.iris(text.length)} characters`,
            `Discord takes ${paint.iris(max)} at most.`
        ]);
    }
    return text;
}

function lengthProblem(what: string, text: string, max: number): string | undefined {
    if (text === '') return `${what} is empty. Give it at least one character`;
    if (text.length > max) {
        return `${what} has ${paint.iris(text.length)} characters. Discord takes ${paint.iris(max)} at most`;
    }
    return undefined;
}

function keyProblem(key: string): string | undefined {
    const what = `The record key ${paint.sky(`'${key}'`)}`;
    return (
        lengthProblem(what, key, DISCORD_LIMITS.key) ??
        (/^[a-z0-9_]+$/.test(key) ? undefined : `${what} can only use a-z, 0-9, and _`)
    );
}

function fieldProblem(key: string, record: LinkedRoleRecord, field: TextField): string | undefined {
    const what = `The ${paint.bold(field)} of the record ${paint.sky(key)}`;
    return lengthProblem(what, record[field], DISCORD_LIMITS[field]);
}

// the records a bot author gave the plugin, and the two request bodies that get built from them.
//
// discord checks almost nothing on a role connection. it saves 'three' in an integer record, and it
// saves a key that isn't in any record. and that could become pretty problematic.
// this class is the only check between what `values` returns and what discord
// saves. anything that's wrong should throw here before the plugin sends a request
export class RecordSet<TRecords extends LinkedRoleRecords> {
    constructor(private readonly records: TRecords) {}

    public firstProblem(): string | undefined {
        const entries = Object.entries(this.records);
        if (entries.length > DISCORD_LIMITS.records) {
            return `${paint.bold('records')} has ${paint.iris(entries.length)} records. Discord takes ${paint.iris(DISCORD_LIMITS.records)} at most`;
        }
        for (const [key, record] of entries) {
            const problem =
                keyProblem(key) ?? fieldProblem(key, record, 'name') ?? fieldProblem(key, record, 'description');
            if (problem !== undefined) return problem;
        }
        return undefined;
    }

    public recordsBody(): RESTPutAPIApplicationRoleConnectionMetadataJSONBody {
        return Object.entries(this.records).map(([key, record]) => ({
            key,
            type: record.type,
            name: record.name,
            description: record.description,
            ...(record.nameLocalizations && { name_localizations: record.nameLocalizations }),
            ...(record.descriptionLocalizations && { description_localizations: record.descriptionLocalizations })
        }));
    }

    public connectionBody(
        connection: RoleConnection<TRecords>
    ): RESTPutAPICurrentUserApplicationRoleConnectionJSONBody {
        this.rejectExtraKeys(connection.metadata);
        return {
            metadata: this.metadataText(connection.metadata),
            ...keepDefined({
                platform_name: withinLimit('platformName', connection.platformName),
                platform_username: withinLimit('platformUsername', connection.platformUsername)
            })
        };
    }

    // typescript lets an extra key through on an inferred return, and discord stores it
    private rejectExtraKeys(metadata: RoleMetadata<TRecords>): void {
        const [extra] = difference(Object.keys(metadata), Object.keys(this.records));
        if (extra === undefined) return;
        throw rejected(
            extra,
            metadata[extra],
            `That key isn't in ${paint.bold('records')}. Add a record for it, or remove it from ${paint.bold('metadata')}.`
        );
    }

    private metadataText(metadata: RoleMetadata<TRecords>): Record<string, string> {
        return mapValues(this.records, (record, key) => {
            const format = KIND_FORMATS[RECORD_KINDS[record.type]];
            const value = metadata[key];
            const text = format.text(value);
            if (text === undefined) throw rejected(String(key), value, format.needs);
            return text;
        });
    }
}
