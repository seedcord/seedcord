export { CustomId, decodeFor, prefixOf } from '#src/CustomId';
export type { AnyCustomId, DecodedRoute, FieldOptions } from '#src/CustomId';

export type { CustomIdField, CustomIdShape, DecodedParams } from '#src/Field';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
