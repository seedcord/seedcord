import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordRangeError, SeedcordTypeError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { isPlainObject, isStringArray } from '@seedcord/utils/internal';

import type { BuildTarget } from './detectTarget';
import type { SeedcordConfig } from './schema';

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

export class ConfigValidator {
    constructor(
        private readonly target: BuildTarget,
        private readonly configFile: string
    ) {}

    public validate(raw: unknown): asserts raw is SeedcordConfig {
        if (!isPlainObject(raw)) throw new SeedcordTypeError(SeedcordErrorCode.CliConfigInvalidExport);
        throwSingleOrAggregate([...this.problems(raw)], SeedcordErrorCode.CliProblems);
    }

    private *problems(raw: Record<string, unknown>): Generator<ConfigProblem> {
        if (!isNonEmptyString(raw.instance))
            yield invalidField('instance', 'a string that points to the file that default exports your bot');
        yield* this.entryProblems(raw.entry);
        yield* this.portProblems(raw.port);
        if (!isOptionalString(raw.root)) yield invalidField('root', 'a string');
        if (raw.idleAnimation !== undefined && typeof raw.idleAnimation !== 'boolean') {
            yield invalidField('idleAnimation', 'a boolean');
        }
        yield* tunnelProblems(raw.tunnel);
        yield* this.buildProblems(raw.build);
        yield* hmrProblems(raw.hmr);
    }

    private unusedField(field: string, why: string): SeedcordTypeError {
        return new SeedcordTypeError(SeedcordErrorCode.CliConfigFieldUnused, [field, this.configFile, why]);
    }

    private *entryProblems(entry: unknown): Generator<SeedcordTypeError> {
        const { target } = this;
        if (target.kind === 'server') {
            if (!isNonEmptyString(entry)) yield invalidField('entry', 'a string that points to your startup script');
        } else if (entry !== undefined) {
            const why = `${paint.path(target.cloudflareConfig)} makes this an edge bot, which has no entry because Cloudflare calls the default export of ${paint.bold('instance')}.`;
            yield this.unusedField('entry', why);
        }
    }

    private *portProblems(port: unknown): Generator<ConfigProblem> {
        if (port === undefined) return;
        if (this.target.kind === 'server') {
            const why = `Only an edge bot reads it. A node http bot sets ${paint.bold('port')} in ${paint.bold('new Seedcord({ ... })')}, and a gateway bot listens on no port.`;
            yield this.unusedField('port', why);
        } else if (typeof port !== 'number' || !Number.isSafeInteger(port)) {
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
        if (this.target.kind === 'edge' && build.outDir !== undefined) {
            const why = `An edge bot can't set it, because ${paint.bold('@cloudflare/vite-plugin')} writes the worker to ${paint.path('.cloudflare/output')}, where ${paint.bold('cf deploy --prebuilt')} reads it.`;
            yield this.unusedField('build.outDir', why);
        } else if (!isOptionalString(build.outDir)) {
            yield invalidField('build.outDir', 'a string');
        }
        if (!isOptionalString(build.tsconfig)) yield invalidField('build.tsconfig', 'a string');
    }
}
