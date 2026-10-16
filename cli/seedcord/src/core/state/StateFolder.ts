import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { paint } from '@seedcord/errors';

import type { ILogger } from '@seedcord/types';

export const STATE_FOLDER = '.seedcord';

const JSON_INDENT = 4;

function readJson(path: string): unknown {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
        return undefined;
    }
}

export interface StateFile<ValueT> {
    readonly name: string;
    readonly defaults: ValueT;
    parse(raw: unknown): ValueT | undefined;
    serialize(value: ValueT): unknown;
}

export class StateFolder {
    private readonly dir: string;

    constructor(
        projectDir: string,
        private readonly logger: ILogger
    ) {
        this.dir = join(projectDir, STATE_FOLDER);
    }

    public read<ValueT>(file: StateFile<ValueT>): ValueT {
        return file.parse(readJson(this.pathOf(file.name))) ?? file.defaults;
    }

    public write<ValueT>(file: StateFile<ValueT>, value: ValueT): void {
        const path = this.pathOf(file.name);
        try {
            mkdirSync(this.dir, { recursive: true });
            writeFileSync(path, `${JSON.stringify(file.serialize(value), null, JSON_INDENT)}\n`);
        } catch (error: unknown) {
            this.logger.warn(`Could not save ${paint.path(path)}`, error);
        }
    }

    private pathOf(name: string): string {
        return join(this.dir, name);
    }
}
