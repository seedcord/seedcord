export { CustomId, decodeFor, prefixOf } from '#src/CustomId';
export type { AnyCustomId, DecodedRoute, FieldOptions } from '#src/CustomId';

export type { CustomIdField, CustomIdShape, DecodedParams } from '#src/Field';

export { setCustomIdErrors } from '#src/errors';
export type { CustomIdErrors } from '#src/errors';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
