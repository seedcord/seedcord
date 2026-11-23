import { ApplicationRoleConnectionMetadataType as RecordType } from 'discord-api-types/v10';

import type { LocalizationMap } from 'discord-api-types/v10';
import type {
    DigitCharacter,
    GreaterThan,
    IsStringLiteral,
    LowercaseLetter,
    Simplify,
    Split,
    StringLength,
    UnionLength
} from 'type-fest';

/**
 * One value that Discord compares for a Linked Role, like a level or a "verified" flag. A server admin
 * sets a role's requirement against it.
 *
 * Its key in `records` can only use `a-z`, `0-9`, and `_`, and can be 50 characters long at most.
 */
export interface LinkedRoleRecord {
    /**
     * A member of `RecordType`, which sets how Discord compares the value. `values` returns a whole number
     * for an integer type, a `Date` for a datetime type, and `true` or `false` for a boolean type.
     *
     * `RecordType` is `ApplicationRoleConnectionMetadataType` from `discord-api-types` under a shorter name.
     */
    type: RecordType;
    /** What Discord shows for the record. 100 characters at most. */
    name: string;
    /** A longer explanation of the record. 200 characters at most. */
    description: string;
    /** The name in other languages, by Discord locale code. */
    nameLocalizations?: LocalizationMap | undefined;
    /** The description in other languages, by Discord locale code. */
    descriptionLocalizations?: LocalizationMap | undefined;
}

/** The `records` of a Linked Roles plugin, by key. Discord takes 5 at most. */
export type LinkedRoleRecords = Record<string, LinkedRoleRecord>;

// from discord's application role connection metadata docs
export const RECORD_LIMITS = { records: 5, key: 50, name: 100, description: 200 } as const;

type Limits = typeof RECORD_LIMITS;
type KeyCharacter = LowercaseLetter | DigitCharacter | '_';

type TooLong<TText extends string, TMax extends number> = GreaterThan<StringLength<TText>, TMax>;

// never for a key that fits, and for one that isn't a literal
type KeyProblem<TKey extends string> =
    IsStringLiteral<TKey> extends false
        ? never
        : [Exclude<Split<TKey, ''>[number], KeyCharacter>] extends [never]
          ? TooLong<TKey, Limits['key']> extends true
              ? `A record key can be ${Limits['key']} characters long at most.`
              : never
          : `'${TKey}' can only use a-z, 0-9, and _.`;

type TextProblems<TRecord extends LinkedRoleRecord> = {
    [Field in 'name' | 'description' as TooLong<TRecord[Field], Limits[Field]> extends true ? Field : never]: {
        error: `A record ${Field} can be ${Limits[Field]} characters long at most.`;
    };
};

// intersect this with a generic `records` parameter to make discord's limits compile errors.
// it only reads literal keys and text, and RecordSet.firstProblem() checks the rest at run time
export type RecordProblems<TRecords extends LinkedRoleRecords> = (GreaterThan<
    UnionLength<keyof TRecords>,
    Limits['records']
> extends true
    ? `Discord takes ${Limits['records']} linked role records at most.`
    : unknown) & {
    [Key in keyof TRecords & string as [KeyProblem<Key>] extends [never] ? never : Key]: KeyProblem<Key>;
} & { [Key in keyof TRecords]: TextProblems<TRecords[Key]> };

interface KindValues {
    integer: number;
    datetime: Date;
    boolean: boolean;
}

export type RecordKind = keyof KindValues;

export const RECORD_KINDS = {
    [RecordType.IntegerLessThanOrEqual]: 'integer',
    [RecordType.IntegerGreaterThanOrEqual]: 'integer',
    [RecordType.IntegerEqual]: 'integer',
    [RecordType.IntegerNotEqual]: 'integer',
    [RecordType.DatetimeLessThanOrEqual]: 'datetime',
    [RecordType.DatetimeGreaterThanOrEqual]: 'datetime',
    [RecordType.BooleanEqual]: 'boolean',
    [RecordType.BooleanNotEqual]: 'boolean'
} as const satisfies Record<RecordType, RecordKind>;

/**
 * A value for every record, typed by the record's `type`.
 *
 * @typeParam TRecords - The `records` you pass.
 */
export type RoleMetadata<TRecords extends LinkedRoleRecords> = Simplify<{
    // records inferred through a `const` type parameter are readonly
    -readonly [Key in keyof TRecords]: KindValues[(typeof RECORD_KINDS)[TRecords[Key]['type']]];
}>;

/**
 * A user's Linked Roles connection. Discord shows the platform name and username on the
 * user's profile, and compares `metadata` to each role's requirements.
 *
 * @typeParam TRecords - The `records` you pass.
 */
export interface RoleConnection<TRecords extends LinkedRoleRecords> {
    /** The name of your service. 50 characters at most. */
    platformName?: string | undefined;
    /** The user's name on your service. 100 characters at most. */
    platformUsername?: string | undefined;
    metadata: RoleMetadata<TRecords>;
}
