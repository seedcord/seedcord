export { LinkedRoles } from './LinkedRoles';

// rare external re-export for convenience. and also to shorten the name
export { ApplicationRoleConnectionMetadataType as RecordType } from 'discord-api-types/v10';

export type { LinkedRoleRecord, LinkedRoleRecords, RoleConnection, RoleMetadata } from './LinkedRoleRecord';
export type { ConnectingUser, LinkedRolesOptions } from './LinkedRoles';
export type { LinkedRolesResult } from './LinkedRolesResult';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
