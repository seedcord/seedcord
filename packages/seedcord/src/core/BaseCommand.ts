import { Logger } from '@seedcord/logger';

import type { Command } from '@commander-js/extra-typings';

export abstract class BaseCommand {
    protected readonly logger: Logger;

    constructor(
        public readonly name: string,
        public readonly description: string,
        label: string
    ) {
        this.logger = new Logger(label, { channel: 'cli' });
    }

    public abstract register(program: Command): void;
}
