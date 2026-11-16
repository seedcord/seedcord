import { asError } from './asError';

export function errorReason(caught: unknown): string {
    const error = asError(caught);
    const reason =
        error.message ||
        (error instanceof AggregateError ? error.errors.map((inner) => errorReason(inner)).join(', ') : '') ||
        ('code' in error ? String(error.code) : error.name);
    return reason.replace(/\.$/, '');
}
