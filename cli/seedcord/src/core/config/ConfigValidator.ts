import { TAKEN_NAMES } from '@seedcord/cli-templates/helper-names';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordRangeError, SeedcordTypeError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { isPlainObject, isStringArray } from '@seedcord/utils/internal';

import type { BuildTarget, EdgeTarget, ServerTarget } from './detectTarget';
import type { SeedcordConfig, SeedcordServerConfig } from './schema';
import type { ExtractStrict } from 'type-fest';

type ConfigProblem = SeedcordTypeError | SeedcordRangeError;

const MAX_PORT = 65_535;
const PORT_RANGE = `an integer from 0 to ${MAX_PORT}`;

function isOptionalString(value: unknown): boolean {
    return value === undefined || typeof value === 'string';
}

function isNonEmptyString(value: unknown): boolean {
    return typeof value === 'string' && value.length > 0;
}

function invalidField(field: string, expected: string): SeedcordTypeError {
    return new SeedcordTypeError(SeedcordErrorCode.CliConfigInvalidField, [field, expected]);
}

function* typecheckProblems(value: unknown): Generator<SeedcordTypeError> {
    if (value === undefined || typeof value === 'boolean') return;
    if (!isPlainObject(value)) {
        yield invalidField('dev.hmr.typecheck', 'a boolean or an object');
        return;
    }
    if (!isOptionalString(value.tsconfig)) yield invalidField('dev.hmr.typecheck.tsconfig', 'a string');
}

function* hmrProblems(value: unknown): Generator<SeedcordTypeError> {
    if (value === undefined) return;
    if (!isPlainObject(value)) {
        yield invalidField('dev.hmr', 'an object');
        return;
    }
    if (value.restart !== undefined && !isStringArray(value.restart)) {
        yield invalidField('dev.hmr.restart', 'an array of strings');
    }
    if (value.rollback !== undefined && typeof value.rollback !== 'boolean') {
        yield invalidField('dev.hmr.rollback', 'a boolean');
    }
    yield* typecheckProblems(value.typecheck);
}

function* makeProblems(value: unknown): Generator<SeedcordTypeError> {
    if (value === undefined) return;
    if (!isPlainObject(value)) {
        yield invalidField('make', 'an object');
        return;
    }
    if (!isOptionalString(value.templates)) yield invalidField('make.templates', 'a folder path');
    if (value.helpers === undefined) return;
    if (!isPlainObject(value.helpers)) {
        yield invalidField(
            'make.helpers',
            `an object of functions, like ${paint.bold('{ shout: (text) => text.toUpperCase() }')}`
        );
        return;
    }
    for (const [name, helper] of Object.entries(value.helpers)) {
        const field = `make.helpers.${name}`;
        if (TAKEN_NAMES.has(name)) yield invalidField(field, `renamed because templates already use ${name}`);
        else if (typeof helper !== 'function') yield invalidField(field, 'a function');
    }
}

function* folderOptionProblems(
    key: ExtractStrict<keyof SeedcordConfig, 'emojis' | 'client'>,
    example: string,
    value: unknown
): Generator<SeedcordTypeError> {
    if (value === undefined) return;
    if (!isPlainObject(value)) {
        yield invalidField(key, `an object, like ${paint.bold(`{ dir: '${example}' }`)}`);
        return;
    }
    if (value.dir !== undefined && !isNonEmptyString(value.dir)) yield invalidField(`${key}.dir`, 'a folder path');
}

function* tunnelProblems(value: unknown): Generator<SeedcordTypeError> {
    if (value === undefined || typeof value === 'boolean') return;
    // discord only accepts an https interactions endpoint
    if (typeof value !== 'string' || URL.parse(value)?.protocol !== 'https:') {
        yield invalidField('dev.tunnel', 'a boolean or an https URL');
    }
}

function* portProblems(port: unknown): Generator<ConfigProblem> {
    if (port === undefined) return;
    if (typeof port !== 'number' || !Number.isSafeInteger(port)) {
        yield invalidField('dev.port', PORT_RANGE);
    } else if (port < 0 || port > MAX_PORT) {
        yield new SeedcordRangeError(SeedcordErrorCode.CliConfigInvalidField, ['dev.port', PORT_RANGE]);
    }
}

function* devProblems(value: unknown): Generator<ConfigProblem> {
    if (value === undefined) return;
    if (!isPlainObject(value)) {
        yield invalidField('dev', 'an object');
        return;
    }
    yield* tunnelProblems(value.tunnel);
    yield* portProblems(value.port);
    if (value.idleAnimation !== undefined && typeof value.idleAnimation !== 'boolean') {
        yield invalidField('dev.idleAnimation', 'a boolean');
    }
    yield* hmrProblems(value.hmr);
}

export type CheckedConfig =
    | { readonly target: ServerTarget; readonly config: SeedcordServerConfig }
    | { readonly target: EdgeTarget; readonly config: SeedcordConfig };

type CheckedEdgeConfig = ExtractStrict<CheckedConfig, { target: EdgeTarget }>;

export function isEdgeConfig(checked: CheckedConfig): checked is CheckedEdgeConfig {
    return checked.target.kind === 'edge';
}

export class ConfigValidator {
    constructor(private readonly target: BuildTarget) {}

    public validate(raw: unknown): CheckedConfig {
        this.assertValid(raw);
        // justified: problems() checked build.outDir and build.start on a server target
        // a valid dev.port on a server is accepted and ignored
        return { target: this.target, config: raw } as CheckedConfig;
    }

    private assertValid(raw: unknown): asserts raw is SeedcordConfig {
        if (!isPlainObject(raw)) throw new SeedcordTypeError(SeedcordErrorCode.CliConfigInvalidExport);
        throwSingleOrAggregate([...this.problems(raw)], SeedcordErrorCode.CliProblems);
    }

    private *problems(raw: Record<string, unknown>): Generator<ConfigProblem> {
        if (!isNonEmptyString(raw.instance))
            yield invalidField('instance', 'a string that points to the file that default exports your bot');
        if (!isOptionalString(raw.root)) yield invalidField('root', 'a string');
        if (raw.files !== undefined && !isStringArray(raw.files)) {
            yield invalidField('files', `an array of folder paths, like ${paint.bold("['./locales']")}`);
        }
        yield* this.buildProblems(raw.build);
        yield* devProblems(raw.dev);
        yield* makeProblems(raw.make);
        yield* folderOptionProblems('emojis', './assets/emojis', raw.emojis);
        yield* folderOptionProblems('client', './web', raw.client);
        if (raw.vitePlugins !== undefined && typeof raw.vitePlugins !== 'function') {
            yield invalidField(
                'vitePlugins',
                `a function that returns your Vite plugins, like ${paint.bold('() => [yaml()]')}`
            );
        }
    }

    private *buildProblems(build: unknown): Generator<SeedcordTypeError> {
        if (build === undefined) return;
        if (!isPlainObject(build)) {
            yield invalidField('build', 'an object');
            return;
        }
        if (this.target.kind === 'server') {
            if (!isOptionalString(build.outDir)) yield invalidField('build.outDir', 'a string');
            if (build.start !== undefined && !isNonEmptyString(build.start)) {
                yield invalidField('build.start', 'a string that points to your startup script');
            }
        }
        if (!isOptionalString(build.tsconfig)) yield invalidField('build.tsconfig', 'a string');
    }
}
