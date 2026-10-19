import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordRangeError, SeedcordTypeError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { isPlainObject, isStringArray } from '@seedcord/utils/internal';

import type { BuildTarget, EdgeTarget, ServerTarget } from './detectTarget';
import type { SeedcordConfig, SeedcordServerConfig } from './schema';

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
        yield invalidField('hmr.typecheck', 'a boolean or an object');
        return;
    }
    if (!isOptionalString(value.tsconfig)) yield invalidField('hmr.typecheck.tsconfig', 'a string');
}

function* hmrProblems(value: unknown): Generator<SeedcordTypeError> {
    if (value === undefined) return;
    if (!isPlainObject(value)) {
        yield invalidField('hmr', 'an object');
        return;
    }
    if (value.restart !== undefined && !isStringArray(value.restart)) {
        yield invalidField('hmr.restart', 'an array of strings');
    }
    if (value.rollback !== undefined && typeof value.rollback !== 'boolean') {
        yield invalidField('hmr.rollback', 'a boolean');
    }
    yield* typecheckProblems(value.typecheck);
}

function* tunnelProblems(value: unknown): Generator<SeedcordTypeError> {
    if (value === undefined || typeof value === 'boolean') return;
    // discord only accepts an https interactions endpoint
    if (typeof value !== 'string' || URL.parse(value)?.protocol !== 'https:') {
        yield invalidField('tunnel', 'a boolean or an https URL');
    }
}

export type CheckedConfig =
    | { readonly target: ServerTarget; readonly config: SeedcordServerConfig }
    | { readonly target: EdgeTarget; readonly config: SeedcordConfig };

type CheckedEdgeConfig = Extract<CheckedConfig, { target: EdgeTarget }>;

export function isEdgeConfig(checked: CheckedConfig): checked is CheckedEdgeConfig {
    return checked.target.kind === 'edge';
}

export class ConfigValidator {
    constructor(private readonly target: BuildTarget) {}

    public validate(raw: unknown): CheckedConfig {
        this.assertValid(raw);
        // justified: problems() checked build.outDir and build.start on a server target
        // a valid port on a server is accepted and ignored
        return { target: this.target, config: raw } as CheckedConfig;
    }

    private assertValid(raw: unknown): asserts raw is SeedcordConfig {
        if (!isPlainObject(raw)) throw new SeedcordTypeError(SeedcordErrorCode.CliConfigInvalidExport);
        throwSingleOrAggregate([...this.problems(raw)], SeedcordErrorCode.CliProblems);
    }

    private *problems(raw: Record<string, unknown>): Generator<ConfigProblem> {
        if (!isNonEmptyString(raw.instance))
            yield invalidField('instance', 'a string that points to the file that default exports your bot');
        yield* this.portProblems(raw.port);
        if (!isOptionalString(raw.root)) yield invalidField('root', 'a string');
        if (raw.files !== undefined && !isStringArray(raw.files)) {
            yield invalidField('files', `an array of folder paths, like ${paint.bold("['./locales']")}`);
        }
        if (raw.idleAnimation !== undefined && typeof raw.idleAnimation !== 'boolean') {
            yield invalidField('idleAnimation', 'a boolean');
        }
        yield* tunnelProblems(raw.tunnel);
        yield* this.buildProblems(raw.build);
        yield* hmrProblems(raw.hmr);
        if (raw.vitePlugins !== undefined && typeof raw.vitePlugins !== 'function') {
            yield invalidField(
                'vitePlugins',
                `a function that returns your Vite plugins, like ${paint.bold('() => [yaml()]')}`
            );
        }
    }

    private *portProblems(port: unknown): Generator<ConfigProblem> {
        if (port === undefined) return;
        if (typeof port !== 'number' || !Number.isSafeInteger(port)) {
            yield invalidField('port', PORT_RANGE);
        } else if (port < 0 || port > MAX_PORT) {
            yield new SeedcordRangeError(SeedcordErrorCode.CliConfigInvalidField, ['port', PORT_RANGE]);
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
