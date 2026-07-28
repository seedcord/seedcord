// dropping a non-Error throw would leave the user with no fault card, and every report payload declares an Error
/** @internal */
export function asError(caught: unknown): Error {
    return Error.isError(caught) ? caught : new Error(String(caught), { cause: caught });
}
