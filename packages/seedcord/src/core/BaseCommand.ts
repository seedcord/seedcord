import { Logger } from '@seedcord/logger';

import type { Command } from '@commander-js/extra-typings';
import type { ILogger } from '@seedcord/types';

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
