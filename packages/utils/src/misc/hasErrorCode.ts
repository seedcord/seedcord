export function hasErrorCode(error: unknown, code: string): error is Error & { code: string } {
    return Error.isError(error) && 'code' in error && error.code === code;
}
