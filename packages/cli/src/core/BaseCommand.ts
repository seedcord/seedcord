import { Logger } from '@seedcord/services';

import type { ILogger } from '@seedcord/types';
import type { Command } from 'commander';

export abstract class BaseCommand {
    protected readonly logger: ILogger;

    constructor(
        public readonly name: string,
        public readonly description: string,
        loggerChannel: string
    ) {
        this.logger = new Logger(loggerChannel);
    }

    public abstract register(program: Command): void;
}
