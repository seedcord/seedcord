// handlebars passes the call's arguments, then its options object
export type TemplateHelper = (...args: never[]) => string;

export type SharedHelperName = 'pascal' | 'camel' | 'snake' | 'kebab' | 'timestamp';

// registered per file while rendering, since it reads that file's path
export const IMPORT_OF = 'importOf';

export type CliHelperName = SharedHelperName | typeof IMPORT_OF;
