import type { ColorName } from '@seedcord/types';

export interface Answers {
    directory: string;
    // answering JavaScript still records TypeScript
    language: 'typescript';
    transport: 'gateway' | 'http';
    // capability ids the intent map resolves into intents and partials
    capabilities: string[];
    // null leaves the key empty in .env for the user to fill in
    token: string | null;
    publicKey: string | null;
    botColor: ColorName | `#${string}`;
}

interface FlagSpec<Key extends keyof Answers> {
    // no leading dashes
    name: string;
    // one line, printed by --help
    description: string;
    parse: (raw: string) => Answers[Key];
    // --help prints this beside --no-<name>
    noFlag?: null extends Answers[Key] ? string : never;
}

export interface Step<Key extends keyof Answers> {
    key: Key;
    flag: FlagSpec<Key>;
    // a skipped step leaves its key unset
    skip?: (answers: Partial<Answers>) => boolean;
    ask: (answers: Partial<Answers>) => Promise<Answers[Key]>;
}

// a mixed list of steps assigns to one array
export type AnyStep = { [Key in keyof Answers]: Step<Key> }[keyof Answers];
