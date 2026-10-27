import type { Prompter } from '@seedcord/cli-prompts';
import type { Runtime, Transport } from '@seedcord/core/internal';
import type { BotToken } from '@seedcord/errors/internal';
import type { ColorName } from '@seedcord/types';

export interface Answers {
    directory: string;
    transport: Transport;
    runtime: Runtime;
    capabilities: string[];
    token: BotToken | null;
    testingGuilds: string[];
    botColor: ColorName | `#${string}`;
    install: boolean;
    git: boolean;
}

interface ValueFlag<Key extends keyof Answers> {
    // no leading dashes
    name: string;
    // one line, printed by --help
    description: string;
    parse: (raw: string) => Answers[Key];
    // --help prints this beside --no-<name>
    noFlag?: null extends Answers[Key] ? string : never;
}

// --<name> answers true and --no-<name> answers false
interface SwitchFlag {
    name: string;
    description: string;
    noFlag: string;
}

export interface Step<Key extends keyof Answers> {
    key: Key;
    label: string;
    flag: Answers[Key] extends boolean ? SwitchFlag : ValueFlag<Key>;
    // a skipped step leaves its key unset
    skip?: (answers: Partial<Answers>) => boolean;
    answerWithoutTerminal?: Answers[Key];
    ask: (answers: Partial<Answers>, prompter: Prompter) => Promise<Answers[Key]>;
    shown: (answer: Answers[Key]) => string;
}

// a mixed list of steps assigns to one array
export type AnyStep = { [Key in keyof Answers]: Step<Key> }[keyof Answers];
