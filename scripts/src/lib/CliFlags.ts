import { parseArgs } from 'node:util';

interface FlagDefinition {
    type: 'string' | 'boolean';
    short?: string;
    multiple?: true;
    describe: string;
}

type FlagSpec = Record<string, FlagDefinition>;

type ValueOf<Definition extends FlagDefinition> = Definition extends { type: 'boolean' }
    ? boolean
    : Definition extends { multiple: true }
      ? string[]
      : string | undefined;

type FlagValues<Spec extends FlagSpec> = { [Key in keyof Spec]: ValueOf<Spec[Key]> };

interface ParseArgsOption {
    type: 'string' | 'boolean';
    short?: string;
    multiple?: true;
}

export class CliFlags<Spec extends FlagSpec> {
    constructor(
        private readonly usage: string,
        private readonly spec: Spec
    ) {}

    parse(argv: readonly string[]): FlagValues<Spec> {
        const { values } = parseArgs({ args: [...argv], options: this.options(), strict: true });

        const entries = Object.entries(this.spec).map(([name, definition]) => [
            name,
            this.valueOf(definition, values[name])
        ]);
        return Object.fromEntries(entries) as FlagValues<Spec>;
    }

    wantsHelp(argv: readonly string[]): boolean {
        return argv.some((arg) => arg === '--help' || arg === '-h');
    }

    help(): string {
        const labels = Object.entries(this.spec).map(([name, definition]) => ({
            text: this.label(name, definition),
            describe: definition.describe
        }));
        const width = Math.max(...labels.map(({ text }) => text.length));
        const lines = labels.map(({ text, describe }) => `    ${text.padEnd(width)}  ${describe}`);

        return [`Usage: ${this.usage}`, '', 'Options:', ...lines, ''].join('\n');
    }

    private label(name: string, { short, type }: FlagDefinition): string {
        const flags = short ? `-${short}, --${name}` : `--${name}`;
        return type === 'string' ? `${flags} <value>` : flags;
    }

    private options(): Record<string, ParseArgsOption> {
        const entries = Object.entries(this.spec).map(([name, { type, short, multiple }]) => [
            name,
            { type, ...(short && { short }), ...(multiple && { multiple }) }
        ]);
        return Object.fromEntries(entries) as Record<string, ParseArgsOption>;
    }

    private valueOf(definition: FlagDefinition, value: unknown): boolean | string | string[] | undefined {
        if (definition.type === 'boolean') return value === true;
        if (definition.multiple) return Array.isArray(value) ? value.filter((one) => typeof one === 'string') : [];
        return typeof value === 'string' ? value : undefined;
    }
}
