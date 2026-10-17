export function messageOf(error: unknown): string {
    return Error.isError(error) ? error.message : String(error);
}
