import { Plugin, readFiles } from '@seedcord/gateway';

import type { CoreBase, Generated } from '@seedcord/gateway';

type Messages = Generated<typeof I18n>['messages'];

const MESSAGE_LINE = /^([\w-]+)\s*=\s*(.*)$/;
const ARGUMENT = /\{\s*\$(\w+)\s*\}/g;

// one-line Fluent messages, like `greet = Hello { $name }!`
export class I18n extends Plugin {
    public static readonly id = 'mock-i18n';

    private templates = new Map<string, string>();

    constructor(
        host: CoreBase,
        private readonly dir: string
    ) {
        super(host);
    }

    public async init(): Promise<void> {
        this.templates = await this.read();
    }

    public override async codegen(): Promise<{ messages: Record<string, string[]> }> {
        const templates = await this.read();
        const argumentsOf = (template: string): string[] =>
            template
                .matchAll(ARGUMENT)
                .map(([, name]) => name)
                .filter((name) => name !== undefined)
                .toArray();
        return {
            messages: Object.fromEntries(templates.entries().map(([key, template]) => [key, argumentsOf(template)]))
        };
    }

    public t<Key extends keyof Messages>(key: Key, args: Record<Messages[Key][number], string>): string {
        const values = new Map(Object.entries<string>(args));
        const template = this.templates.get(key) ?? key;
        return template.replaceAll(ARGUMENT, (match, name: string) => values.get(name) ?? match);
    }

    private async read(): Promise<Map<string, string>> {
        const templates = new Map<string, string>();
        for await (const { bytes } of readFiles(this.dir)) {
            for (const line of bytes.toString().split('\n')) {
                const [, key, template] = MESSAGE_LINE.exec(line) ?? [];
                if (key !== undefined && template !== undefined) templates.set(key, template);
            }
        }
        return templates;
    }
}
