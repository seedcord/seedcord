import type { ColorName } from '@seedcord/types';

export interface Answers {
    directory: string;
    // answering JavaScript still records TypeScript
    language: 'typescript';
    transport: 'gateway' | 'http';
    // capability ids. which the intent map resolves into intents and partials
    capabilities: string[];
    token: string;
    publicKey: string;
    botColor: ColorName;
}

interface FlagSpec<Key extends keyof Answers> {
    // no leading dashes
    name: string;
    parse: (raw: string) => Answers[Key];
}

export interface Step<Key extends keyof Answers> {
    key: Key;
    flag: FlagSpec<Key>;
    // a skipped step leaves its key unset
    skip?: (answers: Partial<Answers>) => boolean;
    ask: (answers: Partial<Answers>) => Promise<Answers[Key]>;
}

// indexed so a mixed list of steps assigns to one array
export type AnyStep = { [Key in keyof Answers]: Step<Key> }[keyof Answers];
