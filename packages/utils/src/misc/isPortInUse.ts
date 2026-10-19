export function isPortInUse(error: unknown): boolean {
    return Error.isError(error) && 'code' in error && error.code === 'EADDRINUSE';
}
