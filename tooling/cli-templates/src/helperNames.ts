// handlebars passes the call's arguments, then its options object
export type TemplateHelper = (...args: never[]) => string;

export const SHARED_HELPER_NAMES = ['pascal', 'camel', 'snake', 'kebab', 'quote'] as const;
export type SharedHelperName = (typeof SHARED_HELPER_NAMES)[number];

// reads the path of the file being rendered
export const IMPORT_OF = 'importOf';

export const CLI_HELPER_NAMES: ReadonlySet<string> = new Set([...SHARED_HELPER_NAMES, IMPORT_OF]);
export type CliHelperName = SharedHelperName | typeof IMPORT_OF;
