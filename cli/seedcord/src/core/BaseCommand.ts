import type { Command } from '@commander-js/extra-typings';

export abstract class BaseCommand {
    constructor(
        public readonly name: string,
        public readonly description: string
    ) {}

    public abstract register(program: Command): void;
}
