export function thrownBy(run: () => unknown): unknown {
    try {
        run();
    } catch (error) {
        return error;
    }

    return undefined;
}
