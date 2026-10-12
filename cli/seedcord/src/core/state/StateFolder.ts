import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const JSON_INDENT = 4;

function isMissing(error: unknown): boolean {
    return Error.isError(error) && 'code' in error && error.code === 'ENOENT';
}

function readJson(path: string): unknown {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch (error: unknown) {
        if (isMissing(error) || error instanceof SyntaxError) return undefined;
        throw error;
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

    constructor(projectDir: string) {
        this.dir = join(projectDir, '.seedcord');
    }

    public read<ValueT>(file: StateFile<ValueT>): ValueT {
        return file.parse(readJson(this.pathOf(file.name))) ?? file.defaults;
    }

    public write<ValueT>(file: StateFile<ValueT>, value: ValueT): void {
        mkdirSync(this.dir, { recursive: true });
        writeFileSync(this.pathOf(file.name), `${JSON.stringify(file.serialize(value), null, JSON_INDENT)}\n`);
    }

    private pathOf(name: string): string {
        return join(this.dir, name);
    }
}
