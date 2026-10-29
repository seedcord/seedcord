// handlebars passes the call's arguments, then its options object
export type TemplateHelper = (...args: never[]) => string;

const SHARED_HELPER_NAMES = ['pascal', 'camel', 'snake', 'kebab', 'quote'] as const;
export type SharedHelperName = (typeof SHARED_HELPER_NAMES)[number];

// reads the path of the file being rendered
export const IMPORT_OF = 'importOf';

export const CLI_HELPER_NAMES: ReadonlySet<string> = new Set([...SHARED_HELPER_NAMES, IMPORT_OF]);

const FILLED_NAMES = ['name', 'transport', 'isGateway', 'isEdge', 'toRoot'] as const;
export type FilledName = (typeof FILLED_NAMES)[number];
export const FILLED: ReadonlySet<string> = new Set(FILLED_NAMES);

const HANDLEBARS_HELPERS = [
    'blockHelperMissing',
    'each',
    'helperMissing',
    'if',
    'unless',
    'log',
    'lookup',
    'with'
] as const;

// a config helper with one of these names shadows what templates already read under it
export type TakenName = SharedHelperName | typeof IMPORT_OF | FilledName | (typeof HANDLEBARS_HELPERS)[number];
export const TAKEN_NAMES: ReadonlySet<string> = new Set([...CLI_HELPER_NAMES, ...FILLED, ...HANDLEBARS_HELPERS]);
