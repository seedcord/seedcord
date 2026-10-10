export function asError(caught: unknown): Error {
    return Error.isError(caught) ? caught : new Error(String(caught), { cause: caught });
}
